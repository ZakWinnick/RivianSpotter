#if os(iOS)
import SwiftUI
import CoreLocation
import WidgetKit
#if DEBUG
import os
#endif
#if SWIFT_PACKAGE
import SpotterCore
#endif

/// Opt-in arrival detection. With Always location, iOS relaunches the app as the person enters
/// one of the 20 nearest Rivian places, so the widget is ready when they get there. Created with
/// the store so the delegate exists when iOS relaunches the app in the background.
@MainActor
final class ArrivalMonitor: NSObject, ObservableObject, @preconcurrency CLLocationManagerDelegate {
    static let defaultsKey = "arrivalDetection"
    static let declinedNotice = "Needs Always location. You can allow it in Settings."
    private static let regionLimit = 20

    @Published private(set) var enabled: Bool
    @Published private(set) var notice: String?
    private let manager = CLLocationManager()
    private var places: [Place] = []
    /// Set when the person turns it on, until the When-In-Use to Always chain starts.
    private var upgradePending = false
    /// An Always request is in flight. Only the delegate's authorization change settles it, so a
    /// later `.authorizedAlways` re-enables the feature even after a fallback turned it off.
    private var awaitingAlways = false
    private var promptShown = false

    /// One instance for the app, created by the app delegate at launch.
    static let shared = ArrivalMonitor()

    override init() {
        enabled = UserDefaults.standard.bool(forKey: Self.defaultsKey)
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(resigned), name: UIApplication.willResignActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(activated), name: UIApplication.didBecomeActiveNotification, object: nil)
        if enabled {
            // A background relaunch has no store yet; the widget's snapshot has the places.
            if let directory = try? SharedStore.directory() { places = PlacesSnapshot.read(from: directory).filter(\.isCheckable) }
            reconcile()
        } else { stop() }
    }

    func setEnabled(_ on: Bool) {
        UserDefaults.standard.set(on, forKey: Self.defaultsKey)
        enabled = on
        notice = nil
        awaitingAlways = false
        if on { upgradePending = true; reconcile() } else { upgradePending = false; stop() }
    }

    func update(places: [Place]) {
        self.places = places.filter(\.isCheckable)
        refreshRegions()
    }

    private func reconcile() {
        switch manager.authorizationStatus {
        case .authorizedAlways: upgradePending = false; start()
        case .notDetermined: upgradePending = true; manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            if upgradePending { upgradePending = false; requestAlways() } else if !awaitingAlways { decline(final: true) }
        default: decline(final: true)
        }
    }

    private func requestAlways() {
        awaitingAlways = true; promptShown = false
        manager.requestAlwaysAuthorization()
        // iOS may defer or skip the prompt, leaving the status unchanged with no callback.
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 10_000_000_000)
            self?.settleIfStillWaiting()
        }
    }

    /// No decision arrived. Turn the feature off for now; a later `.authorizedAlways` turns it back on.
    private func settleIfStillWaiting() {
        guard awaitingAlways, enabled, manager.authorizationStatus != .authorizedAlways else { return }
        decline(final: false)
    }

    private func decline(final: Bool) {
        UserDefaults.standard.set(false, forKey: Self.defaultsKey)
        enabled = false; upgradePending = false
        if final { awaitingAlways = false }
        notice = Self.declinedNotice
        stop()
    }

    private func start() {
        manager.startMonitoringSignificantLocationChanges()
        manager.requestLocation()
        refreshRegions()
    }

    private func stop() {
        manager.stopMonitoringSignificantLocationChanges()
        manager.monitoredRegions.forEach(manager.stopMonitoring(for:))
        logRegionCount()
    }

    private func refreshRegions() {
        guard enabled, manager.authorizationStatus == .authorizedAlways, let here = manager.location else { return }
        let nearest = places.compactMap { place -> (Place, CLLocationDistance)? in
            guard let lat = place.latitude, let lon = place.longitude else { return nil }
            return (place, CLLocation(latitude: lat, longitude: lon).distance(from: here))
        }.sorted { $0.1 < $1.1 }.prefix(Self.regionLimit)
        let wanted = Set(nearest.map(\.0.id))
        for region in manager.monitoredRegions where !wanted.contains(region.identifier) { manager.stopMonitoring(for: region) }
        let current = Set(manager.monitoredRegions.map(\.identifier))
        for (place, _) in nearest where !current.contains(place.id) {
            guard let lat = place.latitude, let lon = place.longitude else { continue }
            let region = CLCircularRegion(center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
                                          radius: CheckInSuggestion.nearbyMeters, identifier: place.id)
            region.notifyOnEntry = true; region.notifyOnExit = false
            manager.startMonitoring(for: region)
        }
        logRegionCount()
    }

    private func reloadWidget() { WidgetCenter.shared.reloadTimelines(ofKind: "CheckInWidget") }

    private func logRegionCount() {
        #if DEBUG
        Logger(subsystem: "com.rivianspotter.app", category: "arrival").notice("monitored regions: \(self.manager.monitoredRegions.count)")
        #endif
    }

    @objc private func resigned() { if awaitingAlways { promptShown = true } }
    /// Coming back after the Always prompt with no authorization change means "Keep While Using".
    /// The delegate gets a second to report first.
    @objc private func activated() {
        guard awaitingAlways, promptShown else { return }
        promptShown = false
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            self?.settleIfStillWaiting()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways:
            guard enabled || awaitingAlways else { return }
            awaitingAlways = false; upgradePending = false
            if !enabled {
                UserDefaults.standard.set(true, forKey: Self.defaultsKey)
                enabled = true
            }
            notice = nil
            start()
        case .authorizedWhenInUse:
            if upgradePending { upgradePending = false; requestAlways() }
            else if enabled || awaitingAlways { decline(final: !awaitingAlways) }
        case .denied, .restricted:
            if enabled || awaitingAlways { decline(final: true) }
        default: break
        }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        refreshRegions(); reloadWidget()
    }
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        #if DEBUG
        Logger(subsystem: "com.rivianspotter.app", category: "arrival").notice("entered region \(region.identifier) state \(UIApplication.shared.applicationState.rawValue)")
        #endif
        reloadWidget()
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    /// Runs on every launch, including iOS relaunching the app in the background for a region
    /// entry, before any scene exists. Creating the monitor here gives it a delegate to call.
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        _ = ArrivalMonitor.shared
        return true
    }
}
#endif
