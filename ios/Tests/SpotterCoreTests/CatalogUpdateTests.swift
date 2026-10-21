import Foundation
#if !STANDALONE_CORE_TESTS
import XCTest
@testable import SpotterCore
#endif

final class CatalogUpdateTests: XCTestCase {
    private func changedCatalog() throws -> Data {
        let bundled = try Catalog.bundled()
        var json = try JSONSerialization.jsonObject(with: JSONEncoder().encode(bundled)) as! [String: Any]
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
        var invalid = places[0]; invalid["latitude"] = 999
        json["places"] = [invalid]
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
        var aliased = places[1]; aliased["aliases"] = [places[0]["id"]!]
        json["places"] = [places[0], aliased]
        XCTAssertThrowsError(try Catalog.validated(JSONSerialization.data(withJSONObject: json)))
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
