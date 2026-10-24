import Foundation
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class PlacesSnapshotTests: XCTestCase {
    private var root: URL!
    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    }
    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    func testRoundTripKeepsOnlyCheckable() throws {
        let places = try Catalog.bundled().places
        let checkable = places.filter(\.isCheckable)
        XCTAssertFalse(checkable.isEmpty)
        XCTAssertTrue(places.contains { $0.status == "planned" })
        try PlacesSnapshot.write(places, to: root)
        let read = PlacesSnapshot.read(from: root)
        XCTAssertFalse(read.contains { $0.status == "planned" })
        XCTAssertEqual(read.map(\.id), checkable.map(\.id))
    }

    func testMissingOrCorruptReadsEmpty() throws {
        XCTAssertTrue(PlacesSnapshot.read(from: root).isEmpty)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        try Data("not json".utf8).write(to: root.appendingPathComponent("widget-places.json"))
        XCTAssertTrue(PlacesSnapshot.read(from: root).isEmpty)
    }

    func testRemoveWithdrawsSnapshot() throws {
        try PlacesSnapshot.write(try Catalog.bundled().places, to: root)
        PlacesSnapshot.remove(from: root)
        XCTAssertTrue(PlacesSnapshot.read(from: root).isEmpty)
        PlacesSnapshot.remove(from: root)
    }
}
