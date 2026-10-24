import Foundation

public extension Place {
    /// A place the check-in widget may offer: pinned on the map, still listed, and open or of unknown status.
    var isCheckable: Bool { hasMapCoordinates && listed && (status == "open" || status == "unknown") }
}

public struct LocationFix: Equatable, Sendable {
    public let latitude: Double, longitude: Double, horizontalAccuracy: Double
    public let timestamp: Date
    public let isPrecise: Bool
    public init(latitude: Double, longitude: Double, horizontalAccuracy: Double, timestamp: Date, isPrecise: Bool) {
        self.latitude = latitude; self.longitude = longitude; self.horizontalAccuracy = horizontalAccuracy
        self.timestamp = timestamp; self.isPrecise = isPrecise
    }
}

public enum CheckInSuggestion: Equatable {
    case nearby(Place, meters: Double, alsoNearby: Bool)
    case closest(Place, meters: Double)
    case needsPreciseLocation, noUsableLocation, noPlaces

    public static let nearbyMeters: Double = 402
    static let maxAccuracyMeters: Double = 100
    static let maxFixAge: TimeInterval = 600

    public static func make(places: [Place], fix: LocationFix?, now: Date) -> CheckInSuggestion {
        let candidates = places.filter(\.isCheckable)
        guard !candidates.isEmpty else { return .noPlaces }
        guard let fix else { return .noUsableLocation }
        guard fix.isPrecise else { return .needsPreciseLocation }
        guard fix.horizontalAccuracy >= 0, fix.horizontalAccuracy <= maxAccuracyMeters,
              now.timeIntervalSince(fix.timestamp) <= maxFixAge else { return .noUsableLocation }
        let ranked = candidates.compactMap { place -> (Place, Double)? in
            guard let lat = place.latitude, let lon = place.longitude else { return nil }
            return (place, distance(fix.latitude, fix.longitude, lat, lon))
        }.sorted { $0.1 < $1.1 }
        guard let (best, meters) = ranked.first else { return .noPlaces }
        guard meters <= nearbyMeters else { return .closest(best, meters: meters) }
        return .nearby(best, meters: meters, alsoNearby: ranked.count > 1 && ranked[1].1 <= nearbyMeters)
    }

    /// Great-circle (haversine) distance in meters.
    static func distance(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
        let p1 = lat1 * .pi / 180, p2 = lat2 * .pi / 180
        let dp = p2 - p1, dl = (lon2 - lon1) * .pi / 180
        let a = sin(dp / 2) * sin(dp / 2) + cos(p1) * cos(p2) * sin(dl / 2) * sin(dl / 2)
        return 2 * 6_371_000 * asin(min(1, a.squareRoot()))
    }
}
