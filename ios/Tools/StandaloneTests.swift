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
            ("Visit lookup matches place aliases", tests.testVisitsMatchPlaceAliases),
            ("Repeat check-ins have no daily limit, newest first", tests.testRepeatCheckInsHaveNoDailyLimit),
            ("Repeat visits persist; unique places count once", tests.testRepeatVisitsPersistAndCountUniquePlacesSeparately),
            ("Every location type supports check-ins", tests.testAllPlaceTypesAcceptCheckIns),
            ("Invalid visits leave storage unchanged", tests.testInvalidVisitDoesNotAlterJournal),
            ("Write failures cannot create phantom visits", tests.testSaveFailureDoesNotCreatePhantomVisit),
            ("Corrupt journals remain untouched", tests.testCorruptFileIsPreserved),
            ("Edit, delete, bookmark, and export round trip", tests.testEditingDeletionBookmarksAndExportRoundTrip),
            ("Base Camp persists, syncs as one item, and clears", tests.testBaseCampPersistsSyncsAndClears),
            ("Status groups and site features use published data", tests.testStatusGroupsAndSiteFeaturesComeFromPublishedData),
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
            try catalogTests.testWebsitePresentationAndSafeDemoBooking()
            try catalogTests.testMapFiltersAndApproximatePlannedPins()
            try catalogTests.testSavedPlaceFollowsNewDetailsAndAliasesWithoutChangingJournal()
            try catalogTests.testInvalidCatalogIsRejected()
            try catalogTests.testFeedFromANewerWebsiteStillUpdatesInstalledApps()
            try catalogTests.testNewerBundledDirectoryReplacesAnOldDownload()
            try catalogTests.testRevisionIsRequiredAndIndependentOfSourceDates()
            try await catalogTests.testStaleResponsesCannotReplaceBundleOrDownloadedSavedDetails()
            try await catalogTests.testDownloadCacheRevalidationAndFailurePreserveLatestDirectory()
        } catch { failure("Catalog updates: \(error)") }
        let checkInTests = CheckInSuggestionTests()
        do {
            try checkInTests.testNearbyWithinQuarterMile()
            try checkInTests.testClosestBeyondQuarterMile()
            try checkInTests.testSkipsUncheckablePlaces()
            try checkInTests.testTwoNearbyFlagsAlsoNearby()
            try checkInTests.testRejectsStaleImpreciseOrReducedFixes()
            checkInTests.testEmptyCatalog()
        } catch { failure("Check-in suggestion: \(error)") }
        let sharedStoreTests = SharedStoreTests()
        let moves: [(String, () throws -> Void)] = [
            ("Journal move keeps visits and Base Camp", sharedStoreTests.testMovePreservesVisitsAndBaseCamp),
            ("Second journal move is a no-op", sharedStoreTests.testSecondRunIsNoOp),
            ("Half-copied destination is replaced", sharedStoreTests.testHalfCopiedDestinationIsReplaced),
            ("Unwritable destination keeps the old journal", sharedStoreTests.testUnwritableDestinationKeepsOld),
            ("Visits only in the destination are never overwritten", sharedStoreTests.testDestinationVisitsMissingFromOldAreNeverOverwritten),
            ("Legacy files move without an old store", sharedStoreTests.testNoOldStoreStillMovesLegacyFiles)
        ]
        for (name, run) in moves {
            let before = failures
            do { try sharedStoreTests.setUpWithError(); try run() } catch { failure("\(name): \(error)") }
            do { try sharedStoreTests.tearDownWithError() } catch { failure("cleanup: \(error)") }
            if failures == before { print("PASS: \(name)") }
        }
        let snapshotTests = PlacesSnapshotTests()
        let snapshots: [(String, () throws -> Void)] = [
            ("Places snapshot keeps only checkable places", snapshotTests.testRoundTripKeepsOnlyCheckable),
            ("Missing or corrupt places snapshot reads empty", snapshotTests.testMissingOrCorruptReadsEmpty)
        ]
        for (name, run) in snapshots {
            let before = failures
            do { try snapshotTests.setUpWithError(); try run() } catch { failure("\(name): \(error)") }
            do { try snapshotTests.tearDownWithError() } catch { failure("cleanup: \(error)") }
            if failures == before { print("PASS: \(name)") }
        }
        print("\(cases.count + moves.count + snapshots.count + 15) cases, \(failures) failures")
        if failures > 0 { exit(1) }
    }
}
