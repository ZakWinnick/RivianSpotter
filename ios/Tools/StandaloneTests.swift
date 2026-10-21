// Executes the same tests on Command Line Tools installations that omit XCTest.
import Foundation

class XCTestCase {
    func setUpWithError() throws {}
    func tearDownWithError() throws {}
}
private var failures = 0
private func failure(_ message: String) { failures += 1; print("FAIL: \(message)") }
func XCTAssertTrue(_ expression: @autoclosure () throws -> Bool) {
    do { if try !expression() { failure("Expected true") } } catch { failure("\(error)") }
}
func XCTAssertFalse(_ expression: @autoclosure () throws -> Bool) {
    do { if try expression() { failure("Expected false") } } catch { failure("\(error)") }
}
func XCTAssertEqual<T: Equatable>(_ lhs: @autoclosure () throws -> T, _ rhs: @autoclosure () throws -> T) {
    do { if try lhs() != rhs() { failure("Values are not equal") } } catch { failure("\(error)") }
}
func XCTAssertNotEqual<T: Equatable>(_ lhs: @autoclosure () throws -> T, _ rhs: @autoclosure () throws -> T) {
    do { if try lhs() == rhs() { failure("Expected different values") } } catch { failure("\(error)") }
}
func XCTAssertGreaterThan<T: Comparable>(_ lhs: T, _ rhs: T) { if lhs <= rhs { failure("Expected greater value") } }
func XCTAssertThrowsError<T>(_ expression: @autoclosure () throws -> T) {
    do { _ = try expression(); failure("Expected an error") } catch {}
}
func XCTUnwrap<T>(_ value: T?) throws -> T {
    guard let value else { throw CocoaError(.coderValueNotFound) }; return value
}

@main
struct StandaloneTests {
    static func main() async {
        let tests = JournalTests()
        let cases: [(String, () throws -> Void)] = [
            ("Catalog types, identities, aliases, and imprecise pins", tests.testBundledInventoryCoversEveryKindAndStableIDs),
            ("Repeat visits persist; unique places count once", tests.testRepeatVisitsPersistAndCountUniquePlacesSeparately),
            ("Every location type supports check-ins", tests.testAllPlaceTypesAcceptCheckIns),
            ("Invalid visits leave storage unchanged", tests.testInvalidVisitDoesNotAlterJournal),
            ("Write failures cannot create phantom visits", tests.testSaveFailureDoesNotCreatePhantomVisit),
            ("Corrupt journals remain untouched", tests.testCorruptFileIsPreserved),
            ("Edit, delete, bookmark, and export round trip", tests.testEditingDeletionBookmarksAndExportRoundTrip),
            ("Search includes places without map pins", tests.testSearchUsesAllTermsAndDoesNotRequireCoordinates),
            ("Cloud local store migrates and reopens offline", tests.testCloudStoreOfflineRoundTripAndMigration),
            ("Independent item edits preserve other device changes", tests.testCloudChangesMergeWithoutReplacingOtherItems),
            ("Tombstones survive stale snapshots and repeat migration", tests.testCloudTombstonesPreventMigrationAndStaleSnapshotResurrection),
            ("Corrupt migration sources stay untouched and don't block the journal", tests.testCloudMigrationPreservesCorruptLegacy),
            ("Unreadable records are skipped and preserved", tests.testCloudLoadSkipsAndPreservesUnreadableRecords),
            ("History keeps only the newest event per item", tests.testCloudHistoryKeepsOnlyTheNewestEventPerItem),
            ("Map clusters stay separated; shared pins stay together", tests.testMapClustersStaySeparatedAndKeepColocatedPlacesTogether)
        ]
        for (name, run) in cases {
            let before = failures
            do { try tests.setUpWithError(); try run() } catch { failure("\(name): \(error)") }
            do { try tests.tearDownWithError() } catch { failure("cleanup: \(error)") }
            if failures == before { print("PASS: \(name)") }
        }
        let catalogTests = CatalogUpdateTests()
        do {
            try catalogTests.testSavedPlaceFollowsNewDetailsAndAliasesWithoutChangingJournal()
            try catalogTests.testInvalidCatalogIsRejected()
            try catalogTests.testFeedFromANewerWebsiteStillUpdatesInstalledApps()
            try catalogTests.testNewerBundledDirectoryReplacesAnOldDownload()
            try await catalogTests.testDownloadCacheRevalidationAndFailurePreserveLatestDirectory()
        } catch { failure("Catalog updates: \(error)") }
        print("\(cases.count + 5) cases, \(failures) failures")
        if failures > 0 { exit(1) }
    }
}
