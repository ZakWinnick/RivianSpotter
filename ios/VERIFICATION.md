# App verification — October 20, 2026

The entries below are chronological. The latest Facades layout revision supersedes the initial palette and Xcode-license limitations.

## Current visual, location, and storage revision

Inspected Code to Adventure’s live typography/palette and the user’s running Facades app. Replaced decorative journal art and generic copy with cream/charcoal surfaces, yellow actions, plain empty states, and a compact photo-card gallery with List and Map alternatives. Cards now use curated Rivian imagery with location-specific photographs and clearly labeled shared charger photographs. Appearance defaults to System and has persistent Light/Dark overrides in Settings.

The shared native app compiles without warnings against the installed macOS 26.5 SDK. Location-based sorting and the recentered map were observed in the running desktop preview. A light-mode setting was selected and visibly changed both Settings and Explore. The preview reopened in light mode. The initial map-imagery gallery was inspected after correcting image overflow and title cropping; the photography revision is recorded below. Gallery/List switching was verified. Dark was selected and rendered; System was selected afterward and correctly followed the current dark system appearance. The preview was left open in Gallery with System selected.

Private iCloud storage is configured in source and entitlements. Local Core Data persistence, safe JSON migration, independent edits, and deletion tombstones are tested without connecting to CloudKit. This does not verify an actual cloud sync. Xcode 27.1 is installed; the attempted iPhone simulator build still exits 69 because the first-launch license has not been accepted.

## Passed

- Native SwiftUI screens compile for macOS against the installed macOS 26.5 SDK, using `Tools/build-preview.sh`.
- Twelve core cases pass through `Tools/test-core.sh`: existing catalog/journal cases plus offline Core Data reopen and legacy migration, independent-item merge, deletion tombstones against stale snapshots/repeated migration, and preservation of corrupt legacy files.
- Three device-service checks pass: precise-pin distance/unknown-pin handling, denied-location behavior, and stale-fix rejection.
- Repository `npm test`: 97 passed, including a new iOS export test against the website's production grouping rules.
- Xcode project, iCloud entitlements, and app Info property lists parse successfully.
- Desktop UI observed: Map/List switching, search for Pasadena, place details with an unavailable coordinate, check-in form, save confirmation, visit on the place page, Want to Visit toggle, journal counts, note editing, and persistence after quitting and reopening the application.

The UI test used an explicitly labeled development visit, not an actual visit by the user. Desktop preview data is isolated from the iOS journal.

## Not yet verified

Xcode’s unaccepted license blocks the current iOS build and simulator checks. The Command Line Tools XCTest module is also absent, so the same core tests were run through the standalone assertion adapter. A default macOS 27 package build could not find Apple's SwiftUI macro plugin; the installed macOS 26.5 SDK compiled the actual screens successfully.

Still required: signed two-device iCloud transfer verification and account transitions; iPhone location permission/denial/approximate-access tests; an iOS build, iPhone/iPad layout and touch checks, VoiceOver and large text, device-level offline behavior, export/share sheets, and physical-device persistence. Desktop checks do not establish those results. Nothing has been submitted to TestFlight or the App Store.

## Photography revision — October 20, 2026

- Inspected official Space pages in the browser and collected 35 unique location photographs (32 Spaces, 3 Outposts). Generic shared heroes and the Denver photograph reused by Toronto/Edina were excluded.
- RAN category photograph: Rivian Joshua Tree charging page. Waypoint category photograph: Rivian's TransAmerica Trail story. Both show actual chargers; neither implies site-specific coverage.
- All 37 distinct image URLs returned HTTP 200 with an image content type.
- Desktop build succeeded. Two catalog checks passed, including photo identity/alias mapping, priority at combined sites, category labeling, omission of generic Space photos, and source hosts. Twelve core cases passed, including photo metadata round trips and decoding pre-photo journal snapshots.
- Observed the updated native gallery with both charger categories and distinct Space images loaded. Source credit links and descriptions are included in place details.
- Image download failures leave a neutral placeholder; initial loads require connectivity. Image permission for public distribution remains unconfirmed. No release or iPhone-device validation is implied.

## Catalog-wide photo search — October 20, 2026

- Retained the 35 existing official location photos. Completed individual web and image queries for all 511 remaining catalog locations, across every type, including planned locations.
- Reviewed 697 candidate source URLs; 37 could not be retrieved. No access controls were bypassed. Checked source metadata against exact street addresses or a unique network/city/state identity. Search captions were used only to find candidates, never as the sole location proof.
- Visually inspected 159 matched selections and replacement choices. Withheld six locations whose candidates were unusable or insufficiently specific. Added 153 unique site photos: 114 primarily RAN, 35 primarily Waypoint, and four service/demo locations. The total is 188 unique site photos for 546 places.
- The remaining 358 are recorded as 125 locations with unverified leads, 38 planned locations, 189 without a verified match, and six with rejected imagery. These statuses describe this research pass, not a claim that no photos exist elsewhere.
- Extended the image/source host allowlists for the reviewed community photo sources; retained HTTPS requirements, bounded caching, and source links. Category fallback is still explicit. No customer journal records or system appearance settings were changed.
- Desktop preview rebuilt successfully. Two catalog tests and 12 core/storage tests passed, including legacy snapshots, safe photo URL handling, unique images across locations, category fallbacks and source attribution. Native preview was reopened and observed loading individual Aberdeen and Albuquerque photos.
- This is local-preview verification. Image rights for public distribution and on-device iOS verification remain outstanding.


## Facades layout revision — October 20, 2026

- Inspected the installed Facades All Stores gallery, Apple Del Amo and Apple The Exchange TRX details, and Address/map and Timeline sheets. No reference-app records were created or edited.
- Replaced the prior Explore tile dashboard with Locations photo galleries, grouped Browse categories, compact phone tabs, and a persistent sidebar for widths of at least 700 points. The universal Xcode target includes both iPhone and iPad.
- Details now lead with the photograph, title and badges, followed by grouped address/map, hours, complete native information, nearby locations, visits, and collapsed sources. Location browsing does not navigate to the RivianSpotter website.
- Retained all 546 locations and 188 exact-site photos. Charger category fallbacks remain labeled. Website category membership is exported separately from additional service capabilities, so directory counts match the website.
- Complete information export now includes separate charging networks, prices, schedules, charger/connector details, amenities, dated statuses, related sites, and planned-location notices. Older detail snapshots do not replace newer network rates/status.
- Xcode 27.1 successfully built the universal iOS simulator app. Desktop preview also built. Twelve core/storage cases, four catalog/information cases, and three device-service cases passed. `git diff --check` passed.
- Installed and ran the final build on the available iPhone Duo simulator. Observed compact photo-first details, loaded location images, category galleries, internal navigation, and the expanded sidebar arrangement. The final Yosemite Outpost detail was captured in `.build/phone-detail-final.png`.
- In the Spaces category, exercised Near me: the native permission prompt, initial unavailable-location error, retry after setting a simulated Cupertino coordinate, and the resulting nearest-first ordering. The simulated coordinate was cleared afterward. This was not a physical GPS test.
- System/Light/Dark preference handling remains in the app. Earlier appearance switching was observed; the final neutral-palette screenshot confirms Light. Final Dark-mode switching was not reverified after the last visual revision because simulator UI control was interrupted/timed out.
- The compatible iOS 26.4 runtime download is still running for dedicated iPad verification. Expanded iPhone layout checks do not constitute an actual iPad run. Signed two-device iCloud sync, physical-device tests, full accessibility testing, and distribution remain outstanding. Unsigned simulator and desktop builds intentionally use local storage.


## First TestFlight upload — October 20, 2026

This entry supersedes earlier signing, runtime, photography-permission, and distribution blockers.

- User confirmed photo permissions, selected the supplied Spotter PNG as the icon, and authorized upload under their personal developer account. The supplied art was resized to an opaque 1024-pixel app icon without redesign.
- Personal team `9KV4L2R733`; bundle `com.rivianspotter.app`; App Store Connect app `6825136178`. Version `0.1.0`, build `1`.
- Release archive and App Store distribution export succeeded. Xcode reported “Upload succeeded” at 18:14 Pacific. App Store Connect finished processing and shows **Ready to Submit**, expiring in 90 days. Beta test instructions were saved. No testers were invited and no external beta review or App Store release was submitted.
- Added the privacy manifest (no tracking; required-reason UserDefaults CA92.1), standard-encryption declaration, and icon asset catalog.
- Core Data’s actual model initialized the CloudKit Development schema successfully. `CD_JournalEvent` with 17 fields was then verified in **Production** for `iCloud.com.rivianspotter.app`. Schema setup used a separate temporary macOS utility under ignored `.build/`; it is not included in the shipping app.
- Release simulator build succeeded. Installed on iPad Pro 11-inch (M5), iOS 26.4. Observed Browse selected by default, persistent sidebar, Spaces gallery, and Alpharetta details with photo, hours, address, services, phone, visits, and source information.
- Still unverified: real two-device iCloud transfers and account changes, physical GPS and offline behavior, comprehensive VoiceOver/large-text testing. Simulator storage is local by design. Production schema presence is not proof of data synchronization.
- Evidence: `.build/upload.log`, `.build/archive.log`, `.build/export.log`, `.build/release-simulator.log`, `.build/schema-init-retry.log`, `.build/testflight-uploaded.png`, and `.build/cloudkit-production.png`.


## Bookmark update / build 2 — October 20, 2026

- Replaced the unsaved location’s plus icon with `bookmark`; the saved state remains `bookmark.fill`. Save behavior and accessibility labels are unchanged.
- Universal Release simulator build and signed Release archive succeeded. App Store Connect accepted version `0.1.0` build `2` at 18:28 Pacific.
- Evidence: `.build/bookmark-build.log`, `.build/archive-build2.log`, and `.build/upload-build2.log`.
- Apple completed processing build 2 and automatically assigned it to the existing internal Test group. Build 1 is Waiting for Review; Apple explicitly blocks submission of another build in version 0.1.0 until that review is approved. Build 2 is Ready to Submit for external review.


## Journal resilience / build 3 — October 20, 2026

- Built PR #32 at `5ae32ea` (`fix/ios-journal-resilience`), with only the local build-number increment to 3 before archiving. The PR was open at build time.
- Thirteen core/storage checks passed, including skipping and preserving unreadable records and non-blocking damaged legacy migration. Three device-service checks and four catalog/detail checks passed.
- Signed Release archive succeeded. Evidence: `.build/archive-build3.log` and `.build/upload-build3.log`.
