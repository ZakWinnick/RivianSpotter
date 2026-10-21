# RivianSpotter for iOS

A native SwiftUI field guide and private visit journal for RANs, Waypoints, Spaces, Service Centers, Demo Centers, and Outposts. Version 0.1.0 (build 2) was uploaded to TestFlight on October 20, 2026 under Zak Winnick’s personal developer account. Apple finished processing it and assigned it to the internal Test group. This build changes the location save control to an outline/filled bookmark. Build 1 is waiting for external beta review; Apple blocks another build’s review submission until that review is approved. No App Store release has been made.

## Open on an iPhone or iPad simulator

1. Install Xcode and launch it once to finish setup and install an iOS simulator runtime.
2. Open `RivianSpotter.xcodeproj` in this directory.
3. Select the **RivianSpotter** scheme and an available iPhone or iPad simulator, then Run.
4. To run on a physical iPhone, select your Apple development team in Signing & Capabilities, connect the phone, and enable Developer Mode if Xcode requests it. The project uses personal team 9KV4L2R733; no private signing keys are committed.

Minimum deployment target: iOS 17. The universal target supports iPhone and iPad. Compact windows use bottom tabs; windows at least 700 points wide use a persistent sidebar. Browse, Spaces, and location details were also verified on an iPad Pro 11-inch (M5) simulator running iOS 26.4. There are no external dependencies or API keys.

## First experience

- **Locations:** Facades-style photo gallery, compact toolbar, search, Near me, and map. The gallery adapts to the available window width.
- **Browse:** The default tab on launch. Grouped Charging and Rivian Places categories. Each opens its own photo gallery with search, Near me, and a map. The wide layout places these categories directly in the sidebar.
- **Place:** Photo first, title and compact type/status/Visit badges, then grouped address/map, hours, and information cards. Includes network-specific charging details, prices and time-of-use schedules, amenities, individual chargers, dated reports, and related places that open inside the app. Sources are collapsed at the bottom. Directions open Apple Maps. Individual photos cover 188 locations; unverified charging photos use an explicitly labeled category image. City-level planned pins stay off maps but remain searchable.
- **Check In:** Record today's visit or a past visit with an optional private note. Return visits are separate entries. For a combined site, choose which location type you visited.
- **Saved:** A private list, separate from visits.
- **Settings:** System appearance by default, with persistent Light and Dark overrides, private iCloud storage status, and location explanation. Appearance is a device preference.
- **Visited:** Journal, total visits, unique places, and unique places visited by the selected type. Edit dates/notes, delete individual visits with confirmation, share a text receipt without the private note, or export the journal as JSON.

Check-ins are self-reported visits; they do not establish opening status, charging activity, or verified physical presence. Visits, notes, and saved places are stored in a local SQLite database and mirrored to the user’s private CloudKit database in the signed iOS app. The desktop preview and unsigned simulator builds use the same database without CloudKit. Existing JSON journals migrate without modifying the original file. A damaged legacy journal is left untouched, retried on the next launch, and reported as a notice in Visited and Settings; it does not block the journal. Records that can't be read (for example, items synced from a newer app version) are skipped, kept in the store unchanged, and counted in the same notice. Nothing is posted publicly.

## Location and iCloud setup

Near me requests When In Use permission only after a tap. It takes a single location fix, sorts precise place pins by straight-line distance, and recenters the map. Approximate location is supported. Unknown pins remain in results without a fabricated distance. Denied access, stale fixes, failures, and timeouts leave manual search/check-ins available. Device coordinates are never written into the journal or synced.

The Xcode target includes the location usage description, CloudKit entitlements, and remote-notification background mode. Personal-team signing and container setup are complete. The actual Core Data model initialized successfully in Development, and `CD_JournalEvent` (17 fields) was verified in Production on October 20, 2026. Two-device transfers remain unverified. For future setup or changes:

1. Complete Xcode’s first-launch license and platform setup.
2. Choose your Apple Developer team and confirm the app’s bundle ID. Enable iCloud / CloudKit and Push Notifications in Signing & Capabilities.
3. Create or select **iCloud.com.rivianspotter.app** for that team. If the bundle/container IDs change, update both `RivianSpotter.entitlements` and `CloudJournalStorage.containerID`.
4. Run the signed app with an iCloud account. In development, verify the `JournalEvent` schema in CloudKit Console. Deploy the schema to Production before TestFlight/App Store builds.
5. Test on two devices signed into the same iCloud account: visit creation, note editing, bookmark/unbookmark, deletion, offline edits followed by reconnect, and sign-out/sign-in. Verify successful transfers and actual data on the second device.

The storage layer appends an event for each changed visit/bookmark, retains deletion tombstones, and deterministically resolves same-item conflicts by timestamp then revision UUID. Unrelated changes are preserved. Existing legacy items migrate once per identity; later tombstones take precedence. Each save keeps only the newest event for the items it changes, so history stays about one event per visit or bookmark; an event another device writes later still competes normally. Core Data handles CloudKit import/export and retries. Status distinguishes account availability, transfer activity, and delays; it does not promise instant sync. A successful local test is not evidence of a cloud transfer.

## Shared catalog

From the repository root:

```sh
node scripts/export-ios-catalog.cjs
```

This uses the website's existing location grouping and stable ID/alias rules. `Sources/SpotterCore/Resources/catalog.json` is a generated bundled snapshot; regenerate it before app builds after the site's inventory changes. The app does not yet download catalog updates. Source dates describe the underlying observations, not the export time. Shared locations retain all relevant categories; adjacent places are not silently merged.

## Verification

With full Xcode available:

```sh
cd ios
swift test
xcodebuild -project RivianSpotter.xcodeproj -scheme RivianSpotter \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

With only Apple's Command Line Tools:

```sh
sh ios/Tools/test-core.sh
sh ios/Tools/test-device-services.sh
sh ios/Tools/build-preview.sh
open 'ios/.build/RivianSpotter Preview.app'
```

The standalone test runner executes the same persistence/catalog tests as XCTest, using small assertion adapters because Command Line Tools do not include XCTest. The desktop preview compiles the shared SwiftUI screens for macOS in a 440 × 820 content window with the same bottom navigation; that is not a substitute for iPhone simulator testing. Its journal is stored separately under `~/Library/Application Support/RivianSpotter-Preview/`. The preview script prefers an installed macOS 26.5 SDK because the macOS 27 Command Line Tools on this machine omit SwiftUI's new macro plugin. If Xcode is selected but its first-launch setup is unfinished, prefix the preview build command with `DEVELOPER_DIR=/Library/Developer/CommandLineTools` to use the existing Command Line Tools installation.

Manual acceptance before a beta: browse each category; search a place without a map pin; switch gallery/map; save and remove a future stop; record two visits to one place; relaunch and confirm persistence; edit and delete one visit; confirm the other remains; inspect an exported backup and shared receipt; test large text, VoiceOver, dark mode, airplane mode, and a narrow iPhone display.

## Deliberately deferred

Photo attachments, expanded place photography, image visit receipts, backup import UI, visitor notifications, automatic catalog refresh, and a public editorial/location timeline. These should be designed around the core journal after the first device review. The first beta includes the user-supplied Spotter icon, a privacy manifest, encryption declaration, and personal-team signing. External beta review and App Store release metadata are separate remaining distribution steps.

The product references are [ifoAppleStore](https://ifoapplestore.com/) for independent reporting and preservation, and [Michael Steeber's introduction to Facades](https://michaelsteeber.substack.com/p/introducing-facades) for an enjoyable, browsable field guide. The current visual reference is the installed Facades app: neutral light/dark surfaces, purple controls, compact photo galleries, and grouped location cards. RivianSpotter uses its own inventory and does not fabricate opening histories or awards to mimic reference content. See [design reference](DESIGN_REFERENCE.md).

## Location photography

`data/location-photos.json` records verified location IDs, image URLs, source pages, descriptions, attribution, and location/category scope. The export gives each location its own photo first, then applies charging category fallbacks. Newer Spaces with generic official hero images are deliberately omitted. Remote images load on demand with a bounded, shared cache and a three-request limit; no Apple street/aerial fallback remains. A first-time image load requires internet access.

The user confirmed permission for these photographs when authorizing the TestFlight upload on October 20, 2026. This records the user’s confirmation, not a separate legal review of each source. See [photo sources](../data/location-photos.json).

The October 20 catalog-wide photo search is recorded in [Photo Coverage](../docs/PHOTO_COVERAGE.md), with per-location queries and leads in `data/photo-coverage.json`. A lead is not a verified photo. Source matching and visual review are required before adding any candidate to `data/location-photos.json`.
