import Foundation
import CoreLocation

@main
struct DeviceServiceChecks {
    @MainActor static func main() throws {
        let service = LocationService(), manager = CLLocationManager()
        let catalog = try Catalog.bundled()
        let place = catalog.places.first(where: \.hasPreciseCoordinates)!
        let point = CLLocation(coordinate: CLLocationCoordinate2D(latitude: place.latitude!, longitude: place.longitude!),
                               altitude: 0, horizontalAccuracy: 100, verticalAccuracy: -1, timestamp: Date())
        service.locationManager(manager, didUpdateLocations: [point])
        precondition(service.distance(to: place)! < 1)
        precondition(service.distanceLabel(to: place) == "< 1 mi")
        let unlocated = catalog.places.first { !$0.hasPreciseCoordinates }!
        precondition(service.distance(to: unlocated) == nil)
        print("PASS: Nearby distances use precise pins; unknown pins remain unknown")
        service.locationManager(manager, didFailWithError: CLError(.denied))
        precondition(service.location == nil && !service.requesting && service.needsSettings)
        precondition(service.message != nil)
        print("PASS: Denied location clears the fix and preserves manual-search guidance")
        let stale = CLLocation(coordinate: point.coordinate, altitude: 0, horizontalAccuracy: 100,
                               verticalAccuracy: -1, timestamp: Date().addingTimeInterval(-600))
        service.locationManager(manager, didUpdateLocations: [stale])
        precondition(service.location == nil && service.message != nil)
        print("PASS: Stale location fixes are rejected")
    }
}
