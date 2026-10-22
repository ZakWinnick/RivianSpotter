# RivianSpotter for iOS

**A field guide to every Rivian place, and a private record of the ones you’ve been to.**

RivianSpotter puts the whole Rivian map in your pocket: Rivian Adventure Network chargers, Waypoints, Spaces, Service Centers, Demo Centers, and Outposts across the US and Canada. Browse them as a photo gallery, by state, by type, or by what’s there: Plug & Charge, a trailer-friendly stall, coffee while you wait. Every place page has the address, directions, hours, published charging details and prices, and where the listing came from.

When you visit somewhere, check in. Your visits become a collection, with stats, visited badges across the app, and a receipt card you can save or share. Pick a Base Camp, the place you think of as home. Visits, notes, saved places, and Base Camp are private and sync through your own iCloud account. Nothing is posted publicly.

The directory refreshes on its own from rivianspotter.com, so new and coming-soon locations show up without an app update. RivianSpotter shows only what Rivian and its sources publish. It doesn’t guess opening dates, invent history, or claim a site is open when the listing doesn’t say.

Runs on iPhone and iPad (iOS 17 or later), in Light, Dark, or System appearance. Current version: **0.2.0**. See [release notes](RELEASE_NOTES.md).

## Open on an iPhone or iPad simulator

1. Install Xcode and launch it once to finish setup and install an iOS simulator runtime.
2. Open `RivianSpotter.xcodeproj` in this directory.
3. Select the **RivianSpotter** scheme and an available iPhone or iPad simulator, then Run.
4. To run on a physical iPhone, select your Apple development team in Signing & Capabilities, connect the phone, and enable Developer Mode if Xcode requests it. The project uses personal team 9KV4L2R733; no private signing keys are committed.

Minimum deployment target: iOS 17. The universal target supports iPhone and iPad. Compact windows use bottom tabs; windows at least 700 points wide use a persistent sidebar. Browse, Spaces, and location details were also verified on an iPad Pro 11-inch (M5) simulator running iOS 26.4. There are no external dependencies or API keys.

## First experience

The app follows Facades, Michael Steeber's Apple Store field guide, using RivianSpotter's own directory. See [design reference](DESIGN_REFERENCE.md).

- **iPhone:** four tabs: Locations, Map, Lists, and Browse. **iPad (700 points or wider):** a Facades-style sidebar with collections (All Locations, Lists, Visited, Saved), Browse (States & Provinces, Location Data, Map, Glossary), Location Type, Site Feature, Status, Base Camp, and Settings.
- **Galleries:** centered title, search, and a "…" menu with sort (Name, State, Nearest, or Recently Visited), layout (Grid, Thumbnails, List), and a Facades-style filter sheet. Photo cards show the type, name, and city or street. Category photos are labeled. Visited places carry an orange seal. Type, feature, and status pages add a "This (n) | Other (n)" switch.
- **Place:** photo, name, type and visit pills, site-feature chips (each opens a glossary sheet), then an Address card with a map sheet (Open in Maps, Copy Address), Directions/Call/Book Demo, hours, a Record card (published listing status and the date the listing was checked), charging, pricing, chargers, related places, and your visits. Website and Share close the page.
- **Lists:** places visited and the share of all locations, then Visit Receipts, Visited, Saved, Base Camp, and visits by type.
- **Visit receipts:** a card with the place, city, visit date, and type, saved or shared as an image. Notes are never included.
- **Base Camp:** the one location you think of as home. It syncs privately through the iCloud journal.
- **Location Data:** charts of the published directory: types, states, status, Rivian Adventure Network power and charger counts, and site features.
- **Settings:** appearance, Base Camp, location updates, iCloud status, export, and location access.

There is no opening history, store number, or Look Around equivalent: the directory doesn't publish them, and the app doesn't invent them.

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

This uses the website's existing location grouping and stable ID/alias rules. `Sources/SpotterCore/Resources/catalog.json` is a generated bundled snapshot; regenerate it before app builds after the site's inventory changes. The app checks the public `/api/v1/catalog.json` feed on launch and foreground (at most every 15 minutes per session), with manual refresh in Browse, galleries, Saved, and Settings. It validates and atomically caches updates, retaining the last valid directory offline. Saved places and open detail pages resolve against the current directory by ID/alias; private journal records are unchanged. See [API contract](../docs/CATALOG_API.md). Source dates describe the underlying observations, not the export time. Shared locations retain all relevant categories; adjacent places are not silently merged.

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

Photo attachments, expanded place photography, image visit receipts, backup import UI, visitor notifications, and a public editorial/location timeline. These should be designed around the core journal after the first device review. The first beta includes the user-supplied Spotter icon, a privacy manifest, encryption declaration, and personal-team signing. External beta review and App Store release metadata are separate remaining distribution steps.

The product references are [ifoAppleStore](https://ifoapplestore.com/) for independent reporting and preservation, and [Michael Steeber's introduction to Facades](https://michaelsteeber.substack.com/p/introducing-facades) for an enjoyable, browsable field guide. The current visual reference is the installed Facades app: neutral light/dark surfaces, purple controls, compact photo galleries, and grouped location cards. RivianSpotter uses its own inventory and does not fabricate opening histories or awards to mimic reference content. See [design reference](DESIGN_REFERENCE.md).

## Location photography

`data/location-photos.json` records verified location IDs, image URLs, source pages, descriptions, attribution, and location/category scope. The export gives each location its own photo first, then applies charging category fallbacks. Newer Spaces with generic official hero images are deliberately omitted. Remote images load on demand with a bounded, shared cache and a three-request limit; no Apple street/aerial fallback remains. A first-time image load requires internet access.

The user confirmed permission for these photographs when authorizing the TestFlight upload on October 20, 2026. This records the user’s confirmation, not a separate legal review of each source. See [photo sources](../data/location-photos.json).

The October 20 catalog-wide photo search is recorded in [Photo Coverage](../docs/PHOTO_COVERAGE.md), with per-location queries and leads in `data/photo-coverage.json`. A lead is not a verified photo. Source matching and visual review are required before adding any candidate to `data/location-photos.json`.
