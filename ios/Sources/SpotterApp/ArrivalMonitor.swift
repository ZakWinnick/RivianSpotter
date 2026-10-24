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
    private var upgradePending = false
    private var alwaysRequested = false
    private var promptShown = false

    override init() {
        enabled = UserDefaults.standard.bool(forKey: Self.defaultsKey)
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(resigned), name: UIApplication.willResignActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(activated), name: UIApplication.didBecomeActiveNotification, object: nil)
        if enabled { reconcile() } else { stop() }
    }

    func setEnabled(_ on: Bool) {
        UserDefaults.standard.set(on, forKey: Self.defaultsKey)
        enabled = on
        notice = nil
        if on { upgradePending = true; reconcile() } else { upgradePending = false; alwaysRequested = false; stop() }
    }

    func update(places: [Place]) {
        self.places = places.filter(\.isCheckable)
        refreshRegions()
    }

    private func reconcile() {
        switch manager.authorizationStatus {
        case .authorizedAlways: upgradePending = false; start()
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            if upgradePending { upgradePending = false; requestAlways() } else if !alwaysRequested { decline() }
        default: decline()
        }
    }

    private func requestAlways() {
        alwaysRequested = true; promptShown = false
        manager.requestAlwaysAuthorization()
        // With no prompt to show (already answered), nothing changes, so give up shortly.
        Task { [weak self] in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            guard let self, self.alwaysRequested, !self.promptShown, self.manager.authorizationStatus != .authorizedAlways else { return }
            self.decline()
        }
    }

    private func decline() {
        UserDefaults.standard.set(false, forKey: Self.defaultsKey)
        enabled = false; alwaysRequested = false; upgradePending = false
        notice = Self.declinedNotice
        stop()
    }

    private func start() {
        alwaysRequested = false
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

    @objc private func resigned() { if alwaysRequested { promptShown = true } }
    @objc private func activated() {
        if alwaysRequested, promptShown, manager.authorizationStatus != .authorizedAlways { decline() }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { if enabled { reconcile() } }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        refreshRegions(); reloadWidget()
    }
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) { reloadWidget() }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
#endif
