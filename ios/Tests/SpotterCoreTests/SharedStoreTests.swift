import Foundation
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class SharedStoreTests: XCTestCase {
    private var root: URL!
    private var old: URL { root.appendingPathComponent("old", isDirectory: true) }
    private var new: URL { root.appendingPathComponent("new", isDirectory: true) }
    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: old, withIntermediateDirectories: true)
    }
    override func tearDownWithError() throws {
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: new.path)
        try FileManager.default.removeItem(at: root)
    }
    private func exists(_ directory: URL, _ name: String) -> Bool {
        FileManager.default.fileExists(atPath: directory.appendingPathComponent(name).path)
    }
    private func places() throws -> [Place] {
        Array(try Catalog.bundled().places.filter { $0.status != "planned" }.prefix(3))
    }
    private func journal(in directory: URL) throws -> Journal {
        let storage = try CloudJournalStorage(url: directory.appendingPathComponent("journal.sqlite"), cloudEnabled: false)
        defer { try? storage.close() }
        return try JournalRepository(storage: storage).journal
    }
    /// Two visits and a Base Camp, as an existing person's journal would hold.
    @discardableResult
    private func seed(_ directory: URL) throws -> Journal {
        let storage = try CloudJournalStorage(url: directory.appendingPathComponent("journal.sqlite"), cloudEnabled: false)
        defer { try? storage.close() }
        let repo = try JournalRepository(storage: storage), places = try places()
        _ = try repo.checkIn(at: places[0], type: places[0].types[0], date: .distantPast, note: "First")
        _ = try repo.checkIn(at: places[1], type: places[1].types[0], date: .distantPast, note: "Second")
        try repo.setBaseCamp(places[2])
        return repo.journal
    }
    func testMovePreservesVisitsAndBaseCamp() throws {
        let before = try seed(old)
        try Data("cache".utf8).write(to: old.appendingPathComponent("directory-cache.json"))
        try Data("legacy".utf8).write(to: old.appendingPathComponent("journal.json"))
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .moved(visits: 2))
        let after = try journal(in: new)
        XCTAssertEqual(after.visits, before.visits)
        XCTAssertTrue(after.baseCamp != nil)
        XCTAssertEqual(after.baseCamp, before.baseCamp)
        for suffix in ["", "-wal", "-shm"] { XCTAssertFalse(exists(old, "journal.sqlite" + suffix)) }
        XCTAssertTrue(exists(old, ".journal-moved"))
        XCTAssertEqual(try Data(contentsOf: new.appendingPathComponent("directory-cache.json")), Data("cache".utf8))
        XCTAssertEqual(try Data(contentsOf: new.appendingPathComponent("journal.json")), Data("legacy".utf8))
        XCTAssertFalse(exists(old, "directory-cache.json"))
        XCTAssertFalse(exists(old, "journal.json"))
    }
    func testSecondRunIsNoOp() throws {
        try seed(old)
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .moved(visits: 2))
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .notNeeded)
        // A copy left behind by an interrupted cleanup is removed, not copied over the moved journal.
        let storage = try CloudJournalStorage(url: old.appendingPathComponent("journal.sqlite"), cloudEnabled: false)
        try storage.close()
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .notNeeded)
        XCTAssertFalse(exists(old, "journal.sqlite"))
        XCTAssertEqual(try journal(in: new).visits.count, 2)
    }
    func testHalfCopiedDestinationIsReplaced() throws {
        try seed(old)
        try FileManager.default.createDirectory(at: new, withIntermediateDirectories: true)
        try Data(repeating: 0xA5, count: 4096).write(to: new.appendingPathComponent("journal.sqlite"))
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .moved(visits: 2))
        XCTAssertEqual(try journal(in: new).visits.count, 2)
    }
    func testUnwritableDestinationKeepsOld() throws {
        try seed(old)
        try FileManager.default.createDirectory(at: new, withIntermediateDirectories: true)
        try FileManager.default.setAttributes([.posixPermissions: 0o555], ofItemAtPath: new.path)
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .keptOld)
        XCTAssertFalse(exists(old, ".journal-moved"))
        XCTAssertFalse(exists(new, "journal.sqlite"))
        XCTAssertEqual(try journal(in: old).visits.count, 2)
    }
    func testDestinationVisitsMissingFromOldAreNeverOverwritten() throws {
        try seed(old)
        // A visit the widget recorded in the group before the app finished moving its journal.
        let widget = try CloudJournalStorage(url: new.appendingPathComponent("journal.sqlite"), cloudEnabled: false)
        let place = try places()[0]
        _ = try JournalRepository(storage: widget).checkIn(at: place, type: place.types[0], date: .distantPast, note: "Widget")
        try widget.close()
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .keptOld)
        XCTAssertEqual(try journal(in: new).visits.map(\.note), ["Widget"])
        XCTAssertEqual(try journal(in: old).visits.count, 2)
    }
    func testNoOldStoreStillMovesLegacyFiles() throws {
        try Data("legacy".utf8).write(to: old.appendingPathComponent("journal.json"))
        XCTAssertEqual(try SharedStore.moveJournalIfNeeded(from: old, to: new), .notNeeded)
        XCTAssertTrue(exists(new, "journal.json"))
        XCTAssertFalse(exists(old, "journal.json"))
        XCTAssertFalse(exists(new, "journal.sqlite"))
    }
}
