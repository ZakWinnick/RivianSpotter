import Foundation
import CoreData
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class JournalTests: XCTestCase {
    private var directory: URL!
    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
    override func tearDownWithError() throws { try FileManager.default.removeItem(at: directory) }
    private func repository() throws -> JournalRepository {
        try JournalRepository(fileURL: directory.appendingPathComponent("journal.json"))
    }
    private func place(_ type: PlaceType = .ran) throws -> Place {
        try XCTUnwrap(Catalog.bundled().places.first { $0.types.contains(type) && $0.status != "planned" })
    }
    func testBundledInventoryCoversEveryKindAndStableIDs() throws {
        let catalog = try Catalog.bundled()
        XCTAssertGreaterThan(catalog.places.count, 500)
        XCTAssertEqual(Set(catalog.places.flatMap(\.types)), Set(PlaceType.allCases))
        XCTAssertEqual(Set(catalog.places.map(\.id)).count, catalog.places.count)
        for place in catalog.places {
            XCTAssertFalse(place.types.isEmpty)
            for alias in place.aliases { XCTAssertEqual(catalog.place(for: alias)?.id, place.id) }
            if place.coordinatePrecision == "city" { XCTAssertFalse(place.hasPreciseCoordinates) }
        }
        // Existing journal snapshots predate optional photo metadata.
        let original = try place()
        var legacy = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(original)) as? [String: Any])
        legacy.removeValue(forKey: "photo")
        let decoded = try JSONDecoder().decode(Place.self, from: JSONSerialization.data(withJSONObject: legacy))
        XCTAssertEqual(decoded.id, original.id)
        XCTAssertTrue(decoded.photo == nil)
        for item in catalog.places {
            if let photo = item.photo {
                XCTAssertTrue(photo.safeImageURL != nil)
                XCTAssertTrue(photo.safeSourceURL != nil)
            }
        }
        if let photo = catalog.places.first(where: { $0.photo != nil })?.photo {
            var unsafe = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(photo)) as? [String: Any])
            unsafe["imageURL"] = "file:///etc/passwd"
            unsafe["sourceURL"] = "https://rivian.com.evil.example/photo"
            let rejected = try JSONDecoder().decode(PlacePhoto.self, from: JSONSerialization.data(withJSONObject: unsafe))
            XCTAssertTrue(rejected.safeImageURL == nil)
            XCTAssertTrue(rejected.safeSourceURL == nil)
        }
    }
    func testRepeatVisitsPersistAndCountUniquePlacesSeparately() throws {
        let repository = try repository(), place = try place()
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let first = try repository.checkIn(at: place, type: .ran, date: date, note: " First road trip ")
        let second = try repository.checkIn(at: place, type: .ran, date: date.addingTimeInterval(86400), note: "Back again")
        XCTAssertNotEqual(first.id, second.id)
        let reloaded = try self.repository().journal
        XCTAssertEqual(reloaded.visits.count, 2)
        XCTAssertEqual(reloaded.uniquePlaceCount, 1)
        XCTAssertEqual(reloaded.count(for: .ran), 1)
        XCTAssertEqual(reloaded.visits.first?.note, "First road trip")
        XCTAssertEqual(reloaded.visits.first?.place, place)
    }
    func testAllPlaceTypesAcceptCheckIns() throws {
        let repository = try repository()
        for type in PlaceType.allCases {
            _ = try repository.checkIn(at: place(type), type: type, date: .distantPast, note: "")
        }
        XCTAssertEqual(try self.repository().journal.visits.count, 6)
    }
    func testInvalidVisitDoesNotAlterJournal() throws {
        let repository = try repository(), place = try place()
        let now = Date()
        XCTAssertThrowsError(try repository.checkIn(at: place, type: .ran, date: now.addingTimeInterval(60), note: "", now: now))
        XCTAssertThrowsError(try repository.checkIn(at: place, type: .space, date: now, note: "", now: now))
        XCTAssertThrowsError(try repository.checkIn(at: place, type: .ran, date: now, note: String(repeating: "a", count: 4001), now: now))
        XCTAssertTrue(repository.journal.visits.isEmpty)
        XCTAssertFalse(FileManager.default.fileExists(atPath: repository.fileURL.path))
    }
    func testSaveFailureDoesNotCreatePhantomVisit() throws {
        let blocker = directory.appendingPathComponent("file-not-directory")
        try Data("blocking file".utf8).write(to: blocker)
        let repository = try JournalRepository(fileURL: blocker.appendingPathComponent("journal.json"))
        XCTAssertThrowsError(try repository.checkIn(at: place(), type: .ran, date: .distantPast, note: ""))
        XCTAssertTrue(repository.journal.visits.isEmpty)
    }
    func testCorruptFileIsPreserved() throws {
        let url = directory.appendingPathComponent("journal.json")
        let original = Data("broken existing journal".utf8)
        try original.write(to: url)
        XCTAssertThrowsError(try repository())
        XCTAssertEqual(try Data(contentsOf: url), original)
    }
    func testEditingDeletionBookmarksAndExportRoundTrip() throws {
        let repository = try repository(), place = try place()
        let visit = try repository.checkIn(at: place, type: .ran, date: .distantPast, note: "old")
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        try repository.update(visit, date: date, note: "new memory")
        try repository.toggleSaved(place)
        XCTAssertEqual(try self.repository().journal.visits.first?.note, "new memory")
        XCTAssertEqual(try self.repository().journal.visits.first?.visitedAt, date)
        XCTAssertEqual(try self.repository().journal.savedPlaces, [place])
        let exported = try JSONDecoder().decode(Journal.self, from: repository.export())
        XCTAssertEqual(exported, repository.journal)
        try repository.toggleSaved(place)
        try repository.delete(visit)
        XCTAssertTrue(try self.repository().journal.visits.isEmpty)
        XCTAssertTrue(try self.repository().journal.savedPlaces.isEmpty)
    }
    func testBaseCampPersistsSyncsAndClears() throws {
        let repository = try repository(), home = try place(), other = try place(.space)
        try repository.setBaseCamp(home)
        XCTAssertEqual(try self.repository().journal.baseCamp, home)
        // Journals written before Base Camp existed still decode.
        var legacy = try XCTUnwrap(JSONSerialization.jsonObject(with: repository.export()) as? [String: Any])
        legacy.removeValue(forKey: "baseCamp")
        XCTAssertTrue(try JSONDecoder().decode(Journal.self, from: JSONSerialization.data(withJSONObject: legacy)).baseCamp == nil)

        let storage = try cloudStore(), cloud = try JournalRepository(storage: storage)
        _ = try cloud.checkIn(at: home, type: .ran, date: .distantPast, note: "")
        try cloud.setBaseCamp(home)
        let stale = try storage.load()
        var otherDevice = stale
        otherDevice.baseCamp = other
        try storage.save(otherDevice, replacing: stale)
        XCTAssertEqual(try cloudStore().load().baseCamp, other)
        XCTAssertEqual(try storage.load().visits.count, 1)
        XCTAssertEqual(storage.unreadableRecordCount, 0)
        try JournalRepository(storage: storage).setBaseCamp(nil)
        XCTAssertTrue(try cloudStore().load().baseCamp == nil)
    }
    func testStatusGroupsAndSiteFeaturesComeFromPublishedData() throws {
        let catalog = try Catalog.bundled()
        for place in catalog.places {
            XCTAssertEqual(Set(place.siteFeatures).count, place.siteFeatures.count)
            let tags = Set((place.information ?? []).flatMap { $0.tags ?? [] })
            XCTAssertEqual(Set(place.siteFeatures), tags)
            if place.status == "planned" && place.listed { XCTAssertEqual(place.statusGroup, .comingSoon) }
            if place.status == "unknown" && place.listed { XCTAssertEqual(place.statusGroup, .unconfirmed) }
        }
        XCTAssertTrue(catalog.places.contains { !$0.siteFeatures.isEmpty })
    }
    func testSearchUsesAllTermsAndDoesNotRequireCoordinates() throws {
        let catalog = try Catalog.bundled()
        let place = try XCTUnwrap(catalog.places.first { !$0.hasPreciseCoordinates && !$0.city.isEmpty })
        XCTAssertTrue(place.matches("  \(place.city.uppercased())   \(place.region) "))
        XCTAssertFalse(place.matches("\(place.city) definitely-not-a-real-place"))
    }
    private func cloudStore(_ name: String = "journal.sqlite") throws -> CloudJournalStorage {
        try CloudJournalStorage(url: directory.appendingPathComponent(name), cloudEnabled: false)
    }
    func testCloudStoreOfflineRoundTripAndMigration() throws {
        let old = try repository(), place = try place()
        let visit = try old.checkIn(at: place, type: .ran, date: .distantPast, note: "Preserve this note")
        try old.toggleSaved(place)
        let storage = try cloudStore()
        try storage.migrate(from: old.fileURL)
        try storage.migrate(from: old.fileURL)
        let repo = try JournalRepository(storage: storage)
        XCTAssertEqual(repo.journal.visits.count, 1)
        XCTAssertEqual(repo.journal.visits.first?.note, "Preserve this note")
        XCTAssertEqual(repo.journal.savedPlaces, [place])
        try repo.update(visit, date: .distantPast, note: "Edited offline")
        let reopened = try cloudStore()
        XCTAssertEqual(try reopened.load().visits.first?.note, "Edited offline")
        XCTAssertEqual(try JSONJournalStorage(url: old.fileURL).load().visits.first?.note, "Preserve this note")
    }
    func testCloudChangesMergeWithoutReplacingOtherItems() throws {
        let storage = try cloudStore(), first = try JournalRepository(storage: storage)
        let a = try first.checkIn(at: place(), type: .ran, date: .distantPast, note: "A")
        let stale = try storage.load()
        let b = try first.checkIn(at: place(.space), type: .space, date: .distantPast, note: "B")
        var otherDevice = stale
        otherDevice.visits[0].note = "Edited A on another device"
        try storage.save(otherDevice, replacing: stale)
        let merged = try storage.load()
        XCTAssertEqual(merged.visits.count, 2)
        XCTAssertEqual(merged.visits.first { $0.id == a.id }?.note, "Edited A on another device")
        XCTAssertEqual(merged.visits.first { $0.id == b.id }?.note, "B")
    }
    func testCloudTombstonesPreventMigrationAndStaleSnapshotResurrection() throws {
        let old = try repository(), place = try place()
        let visit = try old.checkIn(at: place, type: .ran, date: .distantPast, note: "Delete me")
        try old.toggleSaved(place)
        let storage = try cloudStore()
        try storage.migrate(from: old.fileURL)
        let stale = try storage.load()
        let repo = try JournalRepository(storage: storage)
        try repo.delete(visit); try repo.toggleSaved(place)
        try storage.migrate(from: old.fileURL)
        var unrelated = stale
        let other = try self.place(.space)
        unrelated.savedPlaces.append(other)
        try storage.save(unrelated, replacing: stale)
        XCTAssertTrue(try storage.load().visits.isEmpty)
        XCTAssertEqual(try storage.load().savedPlaces, [other])
    }
    func testCloudMigrationPreservesCorruptLegacy() throws {
        let url = directory.appendingPathComponent("journal.json")
        let broken = Data("broken legacy".utf8)
        try broken.write(to: url)
        let storage = try cloudStore()
        XCTAssertEqual(try storage.migrate(from: url), .unreadable)
        XCTAssertEqual(try storage.migrate(from: url), .unreadable)
        XCTAssertEqual(try Data(contentsOf: url), broken)
        // The damaged legacy file must not block the journal itself.
        let repo = try JournalRepository(storage: storage)
        _ = try repo.checkIn(at: place(), type: .ran, date: .distantPast, note: "Still works")
        XCTAssertEqual(try cloudStore().load().visits.first?.note, "Still works")
        XCTAssertEqual(try Data(contentsOf: url), broken)
    }
    private func insertRawEvent(_ storage: CloudJournalStorage, key: String?, payload: Data?) throws {
        let context = storage.container.newBackgroundContext()
        try context.performAndWait {
            let event = NSEntityDescription.insertNewObject(forEntityName: "JournalEvent", into: context)
            event.setValue(key, forKey: "key")
            event.setValue(UUID().uuidString, forKey: "revision")
            event.setValue(Date().addingTimeInterval(60), forKey: "modifiedAt")
            event.setValue(payload, forKey: "payload")
            event.setValue(false, forKey: "isTombstone")
            try context.save()
        }
    }
    private func rawPayloads(_ storage: CloudJournalStorage, key: String) throws -> [Data] {
        let context = storage.container.newBackgroundContext()
        return try context.performAndWait {
            let request = NSFetchRequest<NSManagedObject>(entityName: "JournalEvent")
            request.predicate = NSPredicate(format: "key == %@", key)
            return try context.fetch(request).compactMap { $0.value(forKey: "payload") as? Data }
        }
    }
    private func eventCount(_ storage: CloudJournalStorage) throws -> Int {
        let context = storage.container.newBackgroundContext()
        return try context.performAndWait { try context.count(for: NSFetchRequest<NSManagedObject>(entityName: "JournalEvent")) }
    }
    func testCloudHistoryKeepsOnlyTheNewestEventPerItem() throws {
        let storage = try cloudStore(), repo = try JournalRepository(storage: storage), place = try place()
        let visit = try repo.checkIn(at: place, type: .ran, date: .distantPast, note: "v1")
        for index in 2...20 { try repo.update(visit, date: .distantPast, note: "v\(index)") }
        for _ in 0..<50 { try repo.toggleSaved(place) }
        // One visit event plus one bookmark event (a tombstone after an even number of toggles).
        XCTAssertEqual(try eventCount(storage), 2)
        XCTAssertEqual(try cloudStore().load().visits.first?.note, "v20")
        XCTAssertTrue(try cloudStore().load().savedPlaces.isEmpty)
        // The tombstone still prevents a stale snapshot from resurrecting the bookmark.
        var stale = Journal(); stale.visits = repo.journal.visits; stale.savedPlaces = [place]
        let other = try self.place(.space)
        var unrelated = stale; unrelated.savedPlaces.append(other)
        try storage.save(unrelated, replacing: stale)
        XCTAssertEqual(try storage.load().savedPlaces, [other])
        try repo.delete(visit)
        XCTAssertTrue(try storage.load().visits.isEmpty)
        XCTAssertEqual(try eventCount(storage), 3)
    }
    func testMapClustersStaySeparatedAndKeepColocatedPlacesTogether() throws {
        let places = try Catalog.bundled().places
        let mapped = places.filter(\.hasMapCoordinates)
        for (latSpan, lonSpan) in [(38.0, 58.0), (4.0, 6.0), (0.3, 0.4)] {
            let clusters = PlaceClustering.clusters(places, latitudeSpan: latSpan, longitudeSpan: lonSpan)
            XCTAssertEqual(clusters.map(\.count).reduce(0, +), mapped.count)
            let anchors = clusters.map { $0[0] }
            for (i, a) in anchors.enumerated() {
                for b in anchors[(i + 1)...] {
                    XCTAssertTrue(abs(a.latitude! - b.latitude!) >= latSpan / 8 || abs(a.longitude! - b.longitude!) >= lonSpan / 8)
                }
            }
        }
        // Places sharing a pin land in one cluster that is opened as a list, not zoomed forever.
        let byPin = Dictionary(grouping: mapped) { "\(($0.latitude! * 1e4).rounded()),\(($0.longitude! * 1e4).rounded())" }
        let shared = try XCTUnwrap(byPin.values.first { $0.count > 1 })
        XCTAssertTrue(PlaceClustering.isColocated(shared))
        let close = PlaceClustering.clusters(shared, latitudeSpan: 0.001, longitudeSpan: 0.001)
        XCTAssertEqual(close.count, 1)
        XCTAssertFalse(PlaceClustering.isColocated(Array(mapped.prefix(2))))
    }
    func testCloudLoadSkipsAndPreservesUnreadableRecords() throws {
        let storage = try cloudStore(), repo = try JournalRepository(storage: storage)
        let kept = try repo.checkIn(at: place(), type: .ran, date: .distantPast, note: "Readable")
        let changed = try repo.checkIn(at: place(.space), type: .space, date: .distantPast, note: "Older revision")
        // A visit from a newer app version with a location type this build does not know.
        func futureVisit(_ visit: Visit) throws -> Data {
            var json = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(visit)) as? [String: Any])
            json["type"] = "Supercharger"
            return try JSONSerialization.data(withJSONObject: json)
        }
        let futureID = UUID()
        let future = try futureVisit(Visit(id: futureID, place: place(.space), type: .space, visitedAt: .distantPast, note: "From a newer app"))
        let newerRevision = try futureVisit(changed)
        try insertRawEvent(storage, key: "visit:\(futureID.uuidString)", payload: future)
        try insertRawEvent(storage, key: "visit:\(changed.id.uuidString)", payload: newerRevision)
        try insertRawEvent(storage, key: "saved:damaged", payload: Data("not json".utf8))
        try insertRawEvent(storage, key: nil, payload: nil)

        try repo.reload()
        XCTAssertEqual(repo.journal.visits.map(\.id), [kept.id])
        XCTAssertEqual(repo.unreadableRecordCount, 4)

        // Ordinary edits keep working and never overwrite or tombstone the skipped records.
        try repo.update(kept, date: .distantPast, note: "Edited")
        try repo.toggleSaved(place())
        _ = try repo.checkIn(at: place(), type: .ran, date: .distantPast, note: "New")
        XCTAssertEqual(repo.journal.visits.count, 2)
        XCTAssertEqual(repo.unreadableRecordCount, 4)
        XCTAssertEqual(try rawPayloads(storage, key: "visit:\(futureID.uuidString)"), [future])
        XCTAssertTrue(try rawPayloads(storage, key: "visit:\(changed.id.uuidString)").contains(newerRevision))
        XCTAssertEqual(try rawPayloads(storage, key: "saved:damaged"), [Data("not json".utf8)])
        let reopened = try cloudStore()
        XCTAssertEqual(try reopened.load().visits.count, 2)
        XCTAssertEqual(reopened.unreadableRecordCount, 4)
    }

}
