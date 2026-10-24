# Check-in Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Small, medium and Lock Screen widgets that suggest the closest Rivian place and log a visit in one tap, plus opt-in arrival detection.

**Architecture:** Selection and journal logic go in SpotterCore, which is compiled into both the app and a new WidgetKit extension. The journal SQLite store moves into a shared App Group container. The app keeps CloudKit mirroring; the widget writes to the same store with history tracking only. The app publishes a snapshot of checkable places to the group for the widget to read.

**Tech Stack:** Swift 5, SwiftUI, WidgetKit, App Intents, Core Location, MapKit (`MKMapSnapshotter`), Core Data + CloudKit. iOS 17.

**Spec:** `docs/superpowers/specs/2026-10-24-checkin-widget-design.md` (mockup: `docs/superpowers/specs/assets/2026-10-24-checkin-widget-mockup.png`)

## Global Constraints

- iOS deployment target 17.0. The widget extension is iPhone and iPad only; the macOS preview build (`Package.swift` `SpotterPreview`) must still compile, so put iOS-only code behind `#if os(iOS)`.
- App Group: `group.com.rivianspotter.app`. Widget bundle ID: `com.rivianspotter.app.widget`. Team `9KV4L2R733`, automatic signing.
- "Nearby" radius: 402 m (¼ mile). Usable location: `horizontalAccuracy <= 100` m, timestamp no older than 600 s, and full (not reduced) accuracy.
- Checkable place: `hasMapCoordinates`, `listed != false`, `status` is `"open"` or `"unknown"`.
- Arrival detection: at most 20 monitored regions of 402 m around the nearest checkable places. Off by default.
- Copy is from the spec, exactly: "No nearby site", "Location off", "Allow location to find sites near you", "Open RivianSpotter", "Turn on Precise Location to check in", "Check In", "✓ Checked In", "First visit", "Last visit …", "Couldn't check in. Open RivianSpotter.", Settings toggle "Update widget when I arrive".
- Fonts: system font (`.system`), matching `GuideFont`. Widget surface stays dark (`#1b2620`) in light and dark mode. Button `#d8e7db` with text `#17231b`; confirmed state `#244e3c` with text `#d8e7db`; type dots from `PlaceType.mapColorHex`; the mark is `BrandMark` (asset `BrandMark`, which the extension's asset catalog needs too).
- Nothing about location is stored or sent anywhere.
- Each new SpotterCore source goes in three places: the app target's Sources phase, the widget target's Sources phase, and the `swiftc` file list in `ios/Tools/test-core.sh`. Each new test case goes in `ios/Tools/StandaloneTests.swift`'s list.
- Run core tests with `sh ios/Tools/test-core.sh`; it must end `… 0 failures`. Build with `xcodebuild -project ios/RivianSpotter.xcodeproj -scheme RivianSpotter -destination 'id=<booted iPhone simulator>' build`.

## Review Focus

1. **The app is killed in the middle of the journal move, then relaunched.** The next launch must finish or retry the move and never open an empty store as if it were the journal. Task 3 tests a half-copied destination.
2. **The widget checks in while the app is open in the background.** The app must show the visit when it's foregrounded, without a restart. Task 5 merges remote changes; the Task 8 simulator check covers it.
3. **The widget is added before the app has ever been opened.** With no places snapshot and no migrated journal, the widget shows "Open RivianSpotter", not a crash or a blank. Tasks 4 and 6 test a missing snapshot.
4. **The location is old or imprecise.** The widget never offers Check In off a fix older than 600 s, worse than 100 m, or with reduced accuracy. Task 1 tests all three.
5. **The place is in the journal under an alias ID.** "Last visit" and "Visit #N" match by `[id] + aliases`, as `toggleSaved` does. Task 2 tests an alias match.

---

### Task 1: Choose the place to suggest (SpotterCore)

**Files:**
- Create: `ios/Sources/SpotterCore/CheckInSuggestion.swift`
- Test: `ios/Tests/SpotterCoreTests/CheckInSuggestionTests.swift`
- Modify: `ios/Tools/test-core.sh`, `ios/Tools/StandaloneTests.swift`, `ios/RivianSpotter.xcodeproj/project.pbxproj` (app target Sources)

**Interfaces:**
- Produces:
  - `public extension Place { var isCheckable: Bool }`
  - `public struct LocationFix: Equatable, Sendable { latitude, longitude, horizontalAccuracy: Double; timestamp: Date; isPrecise: Bool }`
  - `public enum CheckInSuggestion: Equatable { case nearby(Place, meters: Double, alsoNearby: Bool); case closest(Place, meters: Double); case needsPreciseLocation; case noUsableLocation; case noPlaces }`
  - `public static func CheckInSuggestion.make(places: [Place], fix: LocationFix?, now: Date) -> CheckInSuggestion`
  - `public static let CheckInSuggestion.nearbyMeters: Double = 402`

- [ ] **Step 1: Write failing tests** in `CheckInSuggestionTests`, using synthetic `Place` values decoded from JSON, as `CatalogUpdateTests` does:
  - `testNearbyWithinQuarterMile`: a RAN 300 m away → `.nearby(ran, meters ≈ 300, alsoNearby: false)`.
  - `testClosestBeyondQuarterMile`: the only place 19 km away → `.closest`.
  - `testSkipsUncheckablePlaces`: a `planned`, a `closed`, a `temporarily-closed` and a `listed: false` place each 50 m away, plus an `"unknown"`-status Waypoint 1 km away → `.closest(waypoint)`.
  - `testTwoNearbyFlagsAlsoNearby`: places at 100 m and 300 m → `.nearby(the 100 m one, alsoNearby: true)`.
  - `testRejectsStaleImpreciseOrReducedFixes`: a fix 601 s old → `.noUsableLocation`; accuracy 150 → `.noUsableLocation`; `isPrecise: false` → `.needsPreciseLocation`; `fix: nil` → `.noUsableLocation`.
  - `testEmptyCatalog` → `.noPlaces`.
- [ ] **Step 2:** Run `sh ios/Tools/test-core.sh`. Expected: compile failure, because `CheckInSuggestion` is not defined.
- [ ] **Step 3: Implement** in `CheckInSuggestion.swift`. Use great-circle distance (haversine, Earth radius 6_371_000 m); no CoreLocation import, so the core stays testable on the command line.
- [ ] **Step 4:** Run `sh ios/Tools/test-core.sh`. Expected: all PASS, `0 failures`.
- [ ] **Step 5:** Commit: `Add check-in suggestion logic for the widget`.

### Task 2: Visit stats and a check-in with a known ID (SpotterCore)

**Files:**
- Modify: `ios/Sources/SpotterCore/Journal.swift`
- Test: `ios/Tests/SpotterCoreTests/JournalTests.swift` (new cases), `ios/Tools/StandaloneTests.swift`

**Interfaces:**
- Produces:
  - `JournalRepository.checkIn(at:type:date:note:now:)` keeps its signature.
  - `public extension Journal { func visits(to place: Place) -> [Visit] }`, matching `[place.id] + place.aliases` against `visit.place.id` and the visit place's aliases, newest first.

- [ ] **Step 1: Write failing tests:**
  - `testVisitsMatchPlaceAliases`: check in at a place, then look it up with a `Place` whose `id` is different but whose `aliases` contains the original ID → count 1.
  - `testRepeatCheckInsHaveNoDailyLimit`: three check-ins at the same place on the same day → three visits, newest first.
- [ ] **Step 2:** Run `sh ios/Tools/test-core.sh`. Expected: FAIL, because `visits(to:)` is not defined. (`SpotterStore.visits(to:)` in the app may already have matching logic; move it into core and have the store call it.)
- [ ] **Step 3:** Implement `visits(to:)` in `Journal.swift`. Replace the app's own copy with a call to it.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Move visit lookup into SpotterCore with alias matching`.

### Task 3: Move the journal into the App Group (SpotterCore)

**Files:**
- Create: `ios/Sources/SpotterCore/SharedStore.swift`
- Test: `ios/Tests/SpotterCoreTests/SharedStoreTests.swift`
- Modify: test-core.sh, StandaloneTests.swift, pbxproj (app target)

**Interfaces:**
- Produces:
  - `public enum SharedStore { static let groupID = "group.com.rivianspotter.app"; static func directory() throws -> URL }`. It returns `containerURL(forSecurityApplicationGroupIdentifier:)/RivianSpotter`, and throws `SharedStoreError.noGroupContainer` when nil (the macOS preview and unit tests pass a URL instead).
  - `public static func SharedStore.moveJournalIfNeeded(from oldDirectory: URL, to newDirectory: URL) throws -> JournalMove` with `public enum JournalMove: Equatable { case notNeeded, moved(visits: Int), keptOld }`

Algorithm, which the tests pin:
1. If `old/journal.sqlite` doesn't exist, return `.notNeeded`.
2. If `new/journal.sqlite` exists and `old/.journal-moved` exists, delete the old files and return `.notNeeded`.
3. Otherwise open the old store with `CloudJournalStorage(url:cloudEnabled: false)` and count its visits. Call `NSPersistentStoreCoordinator.replacePersistentStore(at: new, withPersistentStoreFrom: old, type: .sqlite)`, which overwrites any half-copied destination. Open the new store and count its visits.
4. If the counts match, write `old/.journal-moved`, delete the old `journal.sqlite`, `-wal` and `-shm`, and return `.moved(visits:)`. If they don't match, or any step throws, remove the new copy, leave the old store untouched, and return `.keptOld`.
5. Also move `directory-cache.json` and `journal.json` if present (copy, then delete).

- [ ] **Step 1: Write failing tests:**
  - `testMovePreservesVisitsAndBaseCamp`: two visits plus a Base Camp in the old store → `.moved(visits: 2)`. The new store shows both visits and the same Base Camp, and the old SQLite is gone.
  - `testSecondRunIsNoOp` → `.notNeeded`.
  - `testHalfCopiedDestinationIsReplaced`: write garbage bytes to `new/journal.sqlite` first → `.moved(visits: 2)`, and the new store reads both visits.
  - `testUnwritableDestinationKeepsOld`: make the new directory read-only → `.keptOld`, and the old store still has two visits.
- [ ] **Step 2:** Run the core tests. Expected: FAIL, because `SharedStore` is not defined.
- [ ] **Step 3:** Implement `SharedStore.swift`.
- [ ] **Step 4:** Run the core tests. Expected: PASS.
- [ ] **Step 5:** Commit: `Add a verified move of the journal into the App Group`.

### Task 4: Places snapshot for the widget (SpotterCore)

**Files:**
- Create: `ios/Sources/SpotterCore/PlacesSnapshot.swift`
- Test: `ios/Tests/SpotterCoreTests/PlacesSnapshotTests.swift`
- Modify: test-core.sh, StandaloneTests.swift, pbxproj (app target)

**Interfaces:**
- Produces: `public enum PlacesSnapshot { static func write(_ places: [Place], to directory: URL) throws; static func read(from directory: URL) -> [Place] }`. The file is `widget-places.json`, containing only `isCheckable` places, written atomically. `read` returns `[]` when the file is missing or unreadable.

- [ ] **Step 1: Write failing tests:** `testRoundTripKeepsOnlyCheckable` (a bundled catalog round trip contains no `planned` places and keeps every checkable place's ID); `testMissingOrCorruptReadsEmpty`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `Write a places snapshot for the widget`.

### Task 5: App uses the shared container, publishes the snapshot, and handles links

**Files:**
- Modify: `ios/RivianSpotter.entitlements` (add `com.apple.security.application-groups` = `[group.com.rivianspotter.app]`)
- Modify: `ios/Sources/SpotterApp/SpotterApp.swift` (`SpotterStore.init`, catalog apply, `refresh()`, `@main` scene)
- Modify: `ios/Sources/SpotterApp/Directory.swift` (RootView: route deep links)
- Modify: `ios/AppInfo.plist` (`CFBundleURLTypes` with scheme `rivianspotter`)
- Modify: pbxproj (both build configs): `INFOPLIST_KEY_NSLocationWhenInUseUsageDescription` = "Find Rivian places near you and suggest check-ins in the widget. Your location stays on your device and is not saved in your journal." and `INFOPLIST_KEY_NSLocationAlwaysAndWhenInUseUsageDescription` = "If you turn on Update widget when I arrive, RivianSpotter watches for nearby Rivian places so the widget is ready when you pull in. Your location stays on your device."

**Interfaces:**
- Consumes: `SharedStore.directory()`, `SharedStore.moveJournalIfNeeded`, `PlacesSnapshot.write`.
- Produces: the URL routes the widget uses: `rivianspotter://place/<id>` opens the place page (via the existing `Route.place(id)`); `rivianspotter://nearby` selects the Map tab with Near Me on; `rivianspotter://location` does the same, which runs the existing When-In-Use request.

- [ ] **Step 1:** In `SpotterStore.init` on iOS, compute `directory` from `SharedStore.directory()` and call `moveJournalIfNeeded(from: <old Application Support dir>, to:)` before opening the store. If the move returns `.keptOld`, open the old store and set `error` to "Your journal couldn't be moved for the widget yet. Your visits are safe; the app will try again next launch." The macOS preview keeps its current directory.
- [ ] **Step 2:** After every catalog apply, write `PlacesSnapshot` to the group directory and call `WidgetCenter.shared.reloadAllTimelines()`. Also reload after every journal mutation and on `refresh()`. Remote-change merging is already on (`automaticallyMergesChangesFromParent`, plus `NSPersistentStoreRemoteChangeNotificationPostOptionKey`). Add an observer of `.NSPersistentStoreRemoteChange` that calls `refresh()`, so a widget check-in shows up while the app is open.
- [ ] **Step 3:** Add `.onOpenURL` on the root scene to parse the three routes above. For `nearby` and `location`, set the selected tab to `.map`, bump `mapRequest`, and turn Near Me on. Expose a binding or flag on `CategoryBrowseView` so Near Me can be started from outside; it's currently `@State nearby`.
- [ ] **Step 4:** Build for the simulator. Run once on a simulator that has an existing journal (built from `main` before this branch), with one visit. Expected: the visit is still listed after launching this build, and `journal.sqlite` sits under the group container. Check with `xcrun simctl get_app_container booted com.rivianspotter.app groups`.
- [ ] **Step 5:** Run `sh ios/Tools/test-core.sh` and expect `0 failures`. Commit: `Share the journal and places with the widget; add deep links`.

### Task 6: Widget extension with small, medium and Lock Screen widgets

**Files:**
- Create directory `ios/Sources/SpotterWidget/`:
  - `SpotterWidgetBundle.swift`: `@main struct SpotterWidgetBundle: WidgetBundle` containing `CheckInWidget`.
  - `CheckInWidget.swift`: `StaticConfiguration(kind: "CheckInWidget")`, `.supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])`, `.contentMarginsDisabled()`, `.containerBackground(Color(hex: "#1b2620"), for: .widget)`.
  - `CheckInProvider.swift`: `TimelineProvider`.
  - `WidgetLocation.swift`: a one-shot `CLLocationManager` wrapper returning a `LocationFix?` within 10 s.
  - `CheckInIntents.swift`: `CheckInIntent` and `RefreshIntent`.
  - `CheckInViews.swift`: views per family and state.
  - `MapSnapshot.swift`: medium map image.
  - `Info.plist`: `NSExtension.NSExtensionPointIdentifier = com.apple.widgetkit-extension`, `NSWidgetWantsLocation = YES`.
  - `SpotterWidget.entitlements`: the same App Group.
- Modify pbxproj: add a native target `SpotterWidget` (product type `com.apple.product-type.app-extension`), bundle ID `com.rivianspotter.app.widget`, iOS 17. Its Sources are the files above plus all SpotterCore sources. Its resources are `Assets.xcassets` (for `BrandMark`) and `catalog.json`. Embed it in the app with a "Embed Foundation Extensions" copy phase (dstSubfolderSpec 13), and add a target dependency. Version and build settings must match the app's (`CURRENT_PROJECT_VERSION`, `MARKETING_VERSION`). Hand-edit, following the existing object style; a generator that rewrites the whole project is not allowed.

**Interfaces:**
- Consumes: `CheckInSuggestion.make`, `PlacesSnapshot.read`, `SharedStore.directory()`, `Journal.visits(to:)`, `CloudJournalStorage(url:cloudEnabled: false)`, `JournalRepository.checkIn`.
- Produces:
  - `struct CheckInEntry: TimelineEntry { date: Date; suggestion: CheckInSuggestion; lastVisit: Date?; visitCount: Int; justCheckedIn: Bool; failed: Bool; map: Data? }`
  - `CheckInIntent: AppIntent` with `@Parameter var placeID: String`. It loads the shared journal with `cloudEnabled: false`, finds the place in the snapshot, checks in with `type: place.browseTypes.first!`, `date: .now` and `note: ""`. It writes the confirmation (place ID and time) to `UserDefaults(suiteName: SharedStore.groupID)` key `widget.lastCheckIn`, then calls `WidgetCenter.shared.reloadTimelines(ofKind: "CheckInWidget")`. On error it sets `widget.lastCheckInFailed` instead.
  - `RefreshIntent: AppIntent`, which only reloads the timeline.

Timeline: one entry now, policy `.after(now + 15 min)`. `justCheckedIn` is true when `widget.lastCheckIn` names the suggested place and is less than 15 minutes old. That's the confirmation length.

- [ ] **Step 1:** Add the target and an empty widget that returns a placeholder. Build the app scheme. Expected: success, and `RivianSpotter.app/PlugIns/SpotterWidget.appex` exists in the build products.
- [ ] **Step 2:** Implement the provider, location, intents and views per the spec's four small-widget states, the medium layout (map on the right half, faded into the left; small layout full width when there's no location or no snapshot) and the Lock Screen lines. Tapping the widget body uses `widgetURL`: `place/<id>`, or `nearby` when `alsoNearby`, or `location` for the location states. When the snapshot is empty (`.noPlaces`), show "Open RivianSpotter".
- [ ] **Step 3:** Map snapshot: use `MKMapSnapshotter` with a region fitting you and the place (minimum span 0.01°), `traitCollection` dark, `pointOfInterestFilter = .excludingAll`. Draw the blue dot and the type-colored marker onto the image. Time out after 5 s and fall back to no map.
- [ ] **Step 4:** Build and run on the iPhone 17 Pro simulator with location simulated through `xcrun simctl location booted set <lat>,<lon>`. Add the widget in all three families. Expected, with screenshots saved to `ios/.build/widget-*.png`:
  - At Price, UT (39.6, -110.81 → use the exact catalog coordinates) → "Check In".
  - Tap → "✓ Checked In". Opening the app shows the new visit in Lists.
  - At a point about 20 km from any place → "No nearby site" with the closest place.
  - With location denied → "Location off".
- [ ] **Step 5:** Commit: `Add check-in widgets for Home Screen and Lock Screen`.

### Task 7: Opt-in arrival detection

**Files:**
- Create: `ios/Sources/SpotterApp/ArrivalMonitor.swift`
- Modify: `ios/Sources/SpotterApp/Collections.swift` (the Settings view: a toggle and a one-paragraph explanation)
- Modify: `ios/Sources/SpotterApp/SpotterApp.swift` (start the monitor at launch when enabled)

**Interfaces:**
- Consumes: `Place.isCheckable`, `CheckInSuggestion.nearbyMeters`, the places from `SpotterStore`.
- Produces: `final class ArrivalMonitor: NSObject, CLLocationManagerDelegate` with `func setEnabled(_ on: Bool)` (persisted in `UserDefaults` key `arrivalDetection`, default false) and `func update(places: [Place])`.

Behavior: enabling it calls `requestAlwaysAuthorization()`. With `.authorizedAlways`, it calls `startMonitoringSignificantLocationChanges()`. On each location, it replaces the monitored regions with the 20 nearest checkable places, as `CLCircularRegion` of radius 402. On `didEnterRegion` or a significant change, it calls `WidgetCenter.shared.reloadTimelines(ofKind: "CheckInWidget")`. Disabling it, or authorization below Always, stops significant-change monitoring and removes every region. The explanation reads: "Lets iOS wake RivianSpotter when you arrive at a Rivian place so the widget is ready. Requires Always location. Your location stays on this device."

- [ ] **Step 1:** Implement it and add the toggle.
- [ ] **Step 2:** In the simulator, turn it on and allow Always. Expected: `locationManager.monitoredRegions.count == 20` (log it once in Debug). Then turn it off. Expected: 0 regions.
- [ ] **Step 3:** Commit: `Add opt-in arrival detection for the widget`.

### Task 8: Privacy, release notes, verification and PR

**Files:**
- Modify: `scripts/build-pages.cjs` (the privacy section around the "Network requests" paragraph): add that the widget uses your location on-device to suggest the nearest place, and that arrival detection is opt-in and on-device. Then run `npm run build` and `npm test`.
- Modify: `ios/RELEASE_NOTES.md` (add a widgets paragraph to the existing Version 1.0 section, in the same voice), `ios/AppStore/` text if it lists features, and `ios/VERIFICATION.md`.
- Modify: pbxproj: keep `MARKETING_VERSION = 1.0.0` (not yet released); set the next `CURRENT_PROJECT_VERSION` for both targets.

- [ ] **Step 1:** Make the edits. Run `npm test` (expect pass), `sh ios/Tools/test-core.sh` (expect `0 failures`) and the simulator build.
- [ ] **Step 2:** Run the end-to-end simulator pass with the app open in the background: check in from the widget, foreground the app, and the visit shows without a restart (Review Focus 2). Fresh install, add the widget before launching the app → "Open RivianSpotter" (Review Focus 3).
- [ ] **Step 3:** Commit, push the branch and open a PR. Archive and upload to TestFlight only when the user asks.
