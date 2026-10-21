import SwiftUI
import CoreLocation
import CoreData
import CloudKit
#if SWIFT_PACKAGE
import SpotterCore
#endif

@MainActor
final class LocationService: NSObject, ObservableObject, @preconcurrency CLLocationManagerDelegate {
    @Published private(set) var location: CLLocation?
    @Published private(set) var requesting = false
    @Published private(set) var message: String?
    @Published private(set) var needsSettings = false
    private let manager = CLLocationManager()
    private var timeout: Task<Void, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }
    func request() {
        message = nil; needsSettings = false
        switch manager.authorizationStatus {
        case .notDetermined:
            requesting = true
            manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            requesting = true
            manager.requestLocation()
            timeout?.cancel()
            timeout = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 20_000_000_000)
                guard !Task.isCancelled, let self, self.requesting else { return }
                self.requesting = false
                self.message = "Location is taking too long. Try again or search by city."
            }
        case .denied, .restricted:
            requesting = false; location = nil
            needsSettings = manager.authorizationStatus == .denied
            message = "Location access is off. You can still search and record visits."
        @unknown default:
            requesting = false
            message = "Location is unavailable. Search by city instead."
        }
    }
    func refreshAuthorization() {
        if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
            location = nil
            if requesting { request() }
        }
    }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if requesting { request() } else { refreshAuthorization() }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let fix = locations.last(where: { $0.horizontalAccuracy >= 0 && abs($0.timestamp.timeIntervalSinceNow) < 120 }) else {
            requesting = false
            message = "A recent location isn’t available. Try again or search by city."
            return
        }
        timeout?.cancel(); requesting = false; location = fix; message = nil
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        timeout?.cancel(); requesting = false
        if (error as? CLError)?.code == .denied {
            location = nil; needsSettings = true
            message = "Location access is off. You can still search and record visits."
            return
        }
        message = "Couldn’t find your location. Try again or search by city."
    }
    func distance(to place: Place) -> CLLocationDistance? {
        guard place.hasPreciseCoordinates, let location else { return nil }
        return location.distance(from: CLLocation(latitude: place.latitude!, longitude: place.longitude!))
    }
    func distanceLabel(to place: Place) -> String? {
        guard let meters = distance(to: place) else { return nil }
        let miles = meters / 1609.344
        return miles < 1 ? "< 1 mi" : "\(miles.formatted(.number.precision(.fractionLength(0)))) mi"
    }
}

@MainActor
final class CloudSyncStatus: ObservableObject {
    @Published private(set) var title = "Stored on this device"
    @Published private(set) var detail = "Visits, notes, and saved places are private."
    private var observers: [NSObjectProtocol] = []
    private var enabled = false
    private weak var container: NSPersistentCloudKitContainer?
    private var activeEvents = Set<UUID>()

    func start(storage: CloudJournalStorage, enabled: Bool, onChange: @escaping @MainActor () -> Void) {
        self.enabled = enabled; container = storage.container
        if !enabled { detail = "This preview stores your journal locally. Private iCloud sync is configured for the signed iPhone and iPad app." }
        observers.append(NotificationCenter.default.addObserver(forName: .NSPersistentStoreRemoteChange,
            object: storage.container.persistentStoreCoordinator, queue: .main) { _ in
                Task { @MainActor in onChange() }
            })
        observers.append(NotificationCenter.default.addObserver(forName: NSPersistentCloudKitContainer.eventChangedNotification,
            object: storage.container, queue: .main) { [weak self] notification in
                guard let event = notification.userInfo?[NSPersistentCloudKitContainer.eventNotificationUserInfoKey] as? NSPersistentCloudKitContainer.Event else { return }
                Task { @MainActor in
                    guard let self else { return }
                    if event.endDate == nil {
                        self.activeEvents.insert(event.identifier)
                        self.title = "Syncing with iCloud"
                    } else {
                        self.activeEvents.remove(event.identifier)
                        if event.succeeded {
                            self.title = self.activeEvents.isEmpty ? "iCloud connected" : "Syncing with iCloud"
                            if event.type != .setup {
                                self.detail = "Last iCloud transfer: \(event.endDate!.formatted(date: .abbreviated, time: .shortened)). Changes sync automatically when a connection is available."
                            }
                        } else {
                            self.title = "iCloud sync delayed"
                            self.detail = "Your journal is saved on this device. iCloud will retry automatically. \(event.error?.localizedDescription ?? "Check your connection and iCloud settings.")"
                        }
                        onChange()
                    }
                }
            })
        observers.append(NotificationCenter.default.addObserver(forName: .CKAccountChanged, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.refreshAccount() }
        })
        refreshAccount()
    }
    func refreshAccount() {
        guard enabled else { return }
        Task {
            do {
                let status = try await CKContainer(identifier: CloudJournalStorage.containerID).accountStatus()
                switch status {
                case .available:
                    if title == "Stored on this device" || title == "iCloud unavailable" {
                        title = "iCloud enabled"
                        detail = "Your journal is stored locally and syncs privately through your iCloud account. The first sync may take a few minutes."
                    }
                case .noAccount:
                    title = "iCloud unavailable"; detail = "Sign in to iCloud in Settings to sync. Your journal stays available on this device."
                case .restricted:
                    title = "iCloud unavailable"; detail = "iCloud is restricted on this device. Your journal is saved locally."
                default:
                    title = "iCloud unavailable"; detail = "iCloud couldn’t be reached. Your journal is saved locally and sync will retry automatically."
                }
            } catch {
                title = "iCloud unavailable"
                detail = "Your journal is saved locally. \(error.localizedDescription)"
            }
        }
    }
    deinit { observers.forEach(NotificationCenter.default.removeObserver) }
}
