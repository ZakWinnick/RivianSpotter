import Foundation
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class CheckInSuggestionTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private let origin = (lat: 39.0, lon: -105.0)
    private let metersPerDegree = 111_194.9

    private func place(_ id: String, meters: Double, status: String = "open", listed: Bool = true, type: String = "RAN") throws -> Place {
        let json: [String: Any] = [
            "id": id, "aliases": [], "slug": id, "name": id, "types": [type], "city": "Denver", "region": "CO", "country": "US",
            "address": NSNull(), "latitude": origin.lat + meters / metersPerDegree, "longitude": origin.lon,
            "coordinatePrecision": "exact", "status": status, "listed": listed, "hours": NSNull(), "serviceHours": NSNull(),
            "sourceURL": NSNull(), "checkedOn": NSNull(), "chargerCount": NSNull(), "maxKw": NSNull(), "photo": NSNull()
        ]
        return try JSONDecoder().decode(Place.self, from: JSONSerialization.data(withJSONObject: json))
    }
    private func fix(accuracy: Double = 10, age: TimeInterval = 5, precise: Bool = true) -> LocationFix {
        LocationFix(latitude: origin.lat, longitude: origin.lon, horizontalAccuracy: accuracy,
                    timestamp: now.addingTimeInterval(-age), isPrecise: precise)
    }

    func testNearbyWithinQuarterMile() throws {
        let ran = try place("ran", meters: 300)
        guard case let .nearby(found, meters, also) = CheckInSuggestion.make(places: [ran], fix: fix(), now: now) else {
            return XCTAssertTrue(false)
        }
        XCTAssertEqual(found, ran)
        XCTAssertTrue(abs(meters - 300) < 2)
        XCTAssertFalse(also)
    }
    func testClosestBeyondQuarterMile() throws {
        let far = try place("far", meters: 19_000)
        guard case let .closest(found, meters) = CheckInSuggestion.make(places: [far], fix: fix(), now: now) else {
            return XCTAssertTrue(false)
        }
        XCTAssertEqual(found, far)
        XCTAssertTrue(abs(meters - 19_000) < 50)
    }
    func testSkipsUncheckablePlaces() throws {
        let skipped = [try place("planned", meters: 50, status: "planned"), try place("closed", meters: 50, status: "closed"),
                       try place("temp", meters: 50, status: "temporarily-closed"), try place("unlisted", meters: 50, listed: false)]
        let waypoint = try place("waypoint", meters: 1_000, status: "unknown", type: "Waypoint")
        guard case let .closest(found, _) = CheckInSuggestion.make(places: skipped + [waypoint], fix: fix(), now: now) else {
            return XCTAssertTrue(false)
        }
        XCTAssertEqual(found, waypoint)
        XCTAssertFalse(skipped[0].isCheckable)
        XCTAssertTrue(waypoint.isCheckable)
    }
    func testTwoNearbyFlagsAlsoNearby() throws {
        let near = try place("near", meters: 100), other = try place("other", meters: 300)
        guard case let .nearby(found, _, also) = CheckInSuggestion.make(places: [other, near], fix: fix(), now: now) else {
            return XCTAssertTrue(false)
        }
        XCTAssertEqual(found, near)
        XCTAssertTrue(also)
    }
    func testRejectsStaleImpreciseOrReducedFixes() throws {
        let places = [try place("ran", meters: 100)]
        XCTAssertEqual(CheckInSuggestion.make(places: places, fix: fix(age: 601), now: now), .noUsableLocation)
        XCTAssertEqual(CheckInSuggestion.make(places: places, fix: fix(accuracy: 150), now: now), .noUsableLocation)
        XCTAssertEqual(CheckInSuggestion.make(places: places, fix: fix(precise: false), now: now), .needsPreciseLocation)
        XCTAssertEqual(CheckInSuggestion.make(places: places, fix: nil, now: now), .noUsableLocation)
    }
    func testEmptyCatalog() {
        XCTAssertEqual(CheckInSuggestion.make(places: [], fix: fix(), now: now), .noPlaces)
    }
}
