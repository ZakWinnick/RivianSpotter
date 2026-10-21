import Foundation
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class CatalogUpdateTests: XCTestCase {
    private func changedCatalog(revision: Int64? = nil) throws -> Data {
        let bundled = try Catalog.bundled()
        var json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(bundled)) as! [String: Any]
        if let revision { json["revision"] = revision }
        var places = json["places"] as! [[String: Any]]
        places[0]["status"] = "open"
        places[0]["name"] = "Updated Space"
        places[0]["hours"] = "Daily 10 AM–7 PM"
        json["places"] = places
        return try JSONSerialization.data(withJSONObject: json)
    }
    func testSavedPlaceFollowsNewDetailsAndAliasesWithoutChangingJournal() throws {
        var originalJSON = try JSONSerialization.jsonObject(with: JSONEncoder().encode(Catalog.bundled().places[0])) as! [String: Any]
        originalJSON["status"] = "planned"
        let original = try JSONDecoder().decode(Place.self, from: JSONSerialization.data(withJSONObject: originalJSON))
        let updated = try Catalog.validated(changedCatalog())
        var journal = Journal()
        journal.savedPlaces = [original]
        let visit = Visit(id: UUID(), place: original, type: original.types[0], visitedAt: Date(), note: "Private note")
        journal.visits = [visit]
        let before = journal
        XCTAssertEqual(updated.resolving(original).name, "Updated Space")
        XCTAssertEqual(updated.resolving(original).status, "open")
        XCTAssertEqual(updated.resolving(original).hours, "Daily 10 AM–7 PM")
        var json = try JSONSerialization.jsonObject(with: changedCatalog()) as! [String: Any]
        var places = json["places"] as! [[String: Any]]
        places[0]["id"] = "merged-site"
        places[0]["aliases"] = [original.id] + original.aliases
        json["places"] = places
        let merged = try Catalog.validated(JSONSerialization.data(withJSONObject: json))
        XCTAssertEqual(merged.resolving(original).id, "merged-site")
        let removed = Catalog(schemaVersion: 1, places: [])
        XCTAssertEqual(removed.resolving(original), original)
        XCTAssertEqual(journal, before)
        XCTAssertEqual(journal.visits[0].note, "Private note")
    }
    func testInvalidCatalogIsRejected() throws {
        var json = try JSONSerialization.jsonObject(with: changedCatalog()) as! [String: Any]
        json["schemaVersion"] = 999
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        json["schemaVersion"] = 1
        let places = json["places"] as! [[String: Any]]
        json["places"] = [places[0], places[0]]
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        json["places"] = []
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        var aliased = places[1]; aliased["aliases"] = [places[0]["id"]!]
        json["places"] = [places[0], aliased]
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
    }
    func testFeedFromANewerWebsiteStillUpdatesInstalledApps() throws {
        let bundled = try Catalog.bundled()
        var json = try JSONSerialization.jsonObject(with: changedCatalog()) as! [String: Any]
        var places = json["places"] as! [[String: Any]]
        let mixedID = places[1]["id"] as! String, pinID = places[2]["id"] as! String
        places[1]["types"] = (places[1]["types"] as! [String]) + ["Supercharger"]   // a type added later
        places[1]["directoryTypes"] = ["Supercharger"]
        places[2]["latitude"] = 999.0                                              // one bad pin
        places[3]["types"] = ["Supercharger"]                                      // only unknown types
        places[4]["name"] = 42                                                     // unreadable record
        json["places"] = places
        let catalog = try Catalog.validated(JSONSerialization.data(withJSONObject: json))
        XCTAssertEqual(catalog.places.count, bundled.places.count - 2)
        let mixed = try XCTUnwrap(catalog.place(for: mixedID))
        XCTAssertFalse(mixed.types.isEmpty)
        XCTAssertTrue(mixed.browseTypes.isEmpty)
        let unpinned = try XCTUnwrap(catalog.place(for: pinID))
        XCTAssertTrue(unpinned.latitude == nil)
        XCTAssertFalse(unpinned.hasPreciseCoordinates)
        // A response where most records are unusable is a broken export, not an update.
        json["places"] = places.enumerated().map { index, place in
            var place = place; if index % 3 != 0 { place["types"] = ["Supercharger"] }; return place
        }
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
    }
    func testNewerBundledDirectoryReplacesAnOldDownload() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let url = directory.appendingPathComponent("catalog-cache.json")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let bundled = try Catalog.bundled()
        func write(revision: Int64) throws {
            var json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(bundled)) as! [String: Any]
            json["revision"] = revision // All per-site verification dates stay unchanged.
            let catalog = try Catalog.validated(JSONSerialization.data(withJSONObject: json))
            try JSONEncoder().encode(CatalogSnapshot(catalog: catalog, etag: "old", lastModified: nil, checkedAt: Date())).write(to: url)
        }
        try write(revision: bundled.revision! - 1)
        XCTAssertTrue(CatalogSnapshot.cached(at: url, unlessOlderThan: bundled) == nil)
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
        try write(revision: bundled.revision! + 1)
        XCTAssertEqual(CatalogSnapshot.cached(at: url, unlessOlderThan: bundled)?.etag, "old")
        // With no bundled directory, any valid download is used.
        try write(revision: bundled.revision! - 1)
        XCTAssertEqual(CatalogSnapshot.cached(at: url, unlessOlderThan: nil)?.etag, "old")
        // Pre-revision caches cannot outrank the bundle or contribute stale validators.
        var legacy = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
        var legacyCatalog = legacy["catalog"] as! [String: Any]
        legacyCatalog.removeValue(forKey: "revision")
        legacy["catalog"] = legacyCatalog
        try JSONSerialization.data(withJSONObject: legacy).write(to: url)
        XCTAssertTrue(CatalogSnapshot.cached(at: url, unlessOlderThan: bundled) == nil)
    }
    func testRevisionIsRequiredAndIndependentOfSourceDates() throws {
        var json = try JSONSerialization.jsonObject(with: changedCatalog()) as! [String: Any]
        for invalid: Any in [NSNull(), true, "123", 0, -1, 1.5, 9_007_199_254_740_992] {
            json["revision"] = invalid
            XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        }
        json.removeValue(forKey: "revision")
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        json["revision"] = 42
        json["places"] = (json["places"] as! [[String: Any]]).map { var p = $0; p["checkedOn"] = NSNull(); return p }
        XCTAssertEqual(try Catalog.validated(JSONSerialization.data(withJSONObject: json)).revision, 42)
    }
    func testStaleResponsesCannotReplaceBundleOrDownloadedSavedDetails() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let url = directory.appendingPathComponent("catalog-cache.json")
        defer { try? FileManager.default.removeItem(at: directory) }
        let bundled = try Catalog.bundled()
        let baseline = bundled.revision!
        let old = try changedCatalog(revision: baseline - 1)
        let current = try changedCatalog(revision: baseline + 2)
        let intermediate = try changedCatalog(revision: baseline + 1)
        let behindBundle = CatalogUpdates(cacheURL: url, snapshot: nil, minimumRevision: baseline) { request in
            (old, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                headerFields: ["Content-Type": "application/json", "ETag": "old"])!)
        }
        do { _ = try await behindBundle.refresh(); XCTAssertTrue(false) } catch {}
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))

        actor Feed {
            var calls = 0
            func next() -> Int { calls += 1; return calls }
        }
        let feed = Feed()
        let client = CatalogUpdates(cacheURL: url, snapshot: nil, minimumRevision: baseline) { request in
            switch await feed.next() {
            case 1:
                return (current, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                    headerFields: ["Content-Type": "application/json", "ETag": "current"])!)
            case 2:
                XCTAssertEqual(request.value(forHTTPHeaderField: "If-None-Match"), "current")
                return (intermediate, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                    headerFields: ["Content-Type": "application/json", "ETag": "stale"])!)
            default:
                XCTAssertEqual(request.value(forHTTPHeaderField: "If-None-Match"), "current")
                return (Data(), HTTPURLResponse(url: request.url!, statusCode: 304, httpVersion: nil, headerFields: nil)!)
            }
        }
        let updated = try await client.refresh()
        let before = try Data(contentsOf: url)
        do { _ = try await client.refresh(); XCTAssertTrue(false) } catch {}
        XCTAssertEqual(try Data(contentsOf: url), before)
        let revalidated = try await client.refresh()
        XCTAssertEqual(revalidated.catalog.revision, baseline + 2)
        XCTAssertEqual(revalidated.catalog.resolving(bundled.places[0]).name, "Updated Space")
        XCTAssertEqual(revalidated.catalog.places, updated.catalog.places)
        // Relaunch retains the newest catalog even though all verification dates are unchanged.
        XCTAssertEqual(CatalogSnapshot.cached(at: url, unlessOlderThan: bundled)?.catalog.revision, baseline + 2)
    }
    func testDownloadCacheRevalidationAndFailurePreserveLatestDirectory() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let url = directory.appendingPathComponent("catalog-cache.json")
        defer { try? FileManager.default.removeItem(at: directory) }
        let data = try changedCatalog()
        let first = CatalogUpdates(cacheURL: url) { request in
            XCTAssertEqual(request.url, CatalogUpdates.endpoint)
            return (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                        headerFields: ["Content-Type": "application/json", "ETag": "v2"])!)
        }
        let downloaded = try await first.refresh()
        XCTAssertEqual(downloaded.catalog.places[0].name, "Updated Space")
        XCTAssertEqual(CatalogSnapshot.cached(at: url)?.catalog.places[0].name, "Updated Space")
        // A fresh client after relaunch restores validators and the downloaded directory.
        let revalidate = CatalogUpdates(cacheURL: url) { request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "If-None-Match"), "v2")
            return (Data(), HTTPURLResponse(url: request.url!, statusCode: 304, httpVersion: nil, headerFields: nil)!)
        }
        let unchanged = try await revalidate.refresh()
        XCTAssertEqual(unchanged.catalog.places, downloaded.catalog.places)
        let previousBytes = try Data(contentsOf: url)
        for status in [200, 404, 500] {
            let invalid = CatalogUpdates(cacheURL: url) { request in
                (Data("{\"schemaVersion\":1,\"places\":[]}".utf8),
                 HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil,
                                 headerFields: ["Content-Type": "application/json", "ETag": "bad"])!)
            }
            do { _ = try await invalid.refresh(); XCTAssertTrue(false) } catch {}
            XCTAssertEqual(try Data(contentsOf: url), previousBytes)
        }
        let offline = CatalogUpdates(cacheURL: url) { _ in throw URLError(.notConnectedToInternet) }
        do { _ = try await offline.refresh(); XCTAssertTrue(false) } catch {}
        XCTAssertEqual(try Data(contentsOf: url), previousBytes)
        let html = CatalogUpdates(cacheURL: url) { request in
            (data, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                                   headerFields: ["Content-Type": "text/html"])!)
        }
        do { _ = try await html.refresh(); XCTAssertTrue(false) } catch {}
        XCTAssertEqual(try Data(contentsOf: url), previousBytes)
        try Data("corrupt".utf8).write(to: url)
        XCTAssertTrue(CatalogSnapshot.cached(at: url) == nil)
    }
}
