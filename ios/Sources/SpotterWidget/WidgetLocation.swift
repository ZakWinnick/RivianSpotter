import Foundation
import CoreLocation

/// One location fix for a timeline reload, using the app's When In Use permission
/// (`NSWidgetWantsLocation`). The fix is nil without permission, on error, or after the timeout;
/// `allowed` tells "no permission" apart from "no usable fix".
@MainActor
final class WidgetLocation: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocation?, Never>?

    static func fix(timeout: TimeInterval = 10) async -> (fix: LocationFix?, allowed: Bool) {
        let finder = WidgetLocation()
        guard finder.allowed else { return (nil, false) }
        return (await finder.locate(timeout: timeout), true)
    }

    private var allowed: Bool {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: break
        default: return false
        }
        #if os(iOS)
        return manager.isAuthorizedForWidgetUpdates
        #else
        return true
        #endif
    }

    private func locate(timeout: TimeInterval) async -> LocationFix? {
        // With Precise Location off the suggestion is "turn it on" whatever the fix says, so there's
        // no point asking for one. The coordinates of this fix are never read.
        guard manager.accuracyAuthorization == .fullAccuracy else {
            return LocationFix(latitude: 0, longitude: 0, horizontalAccuracy: -1, timestamp: Date(), isPrecise: false)
        }
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        let location: CLLocation? = await withCheckedContinuation { continuation in
            self.continuation = continuation
            manager.requestLocation()
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                self?.finish(nil)
            }
        }
        guard let location else { return nil }
        return LocationFix(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude,
                           horizontalAccuracy: location.horizontalAccuracy, timestamp: location.timestamp, isPrecise: true)
    }

    private func finish(_ location: CLLocation?) {
        guard let continuation else { return }
        self.continuation = nil
        manager.delegate = nil
        continuation.resume(returning: location)
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let location = locations.last
        Task { @MainActor in self.finish(location) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }
}
