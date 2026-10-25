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


## Pressure-test follow-ups — October 20, 2026

- Storage: each save keeps only the newest event for the items it changes (tombstones included), so 20 edits and 50 bookmark toggles leave 2 events. Stale snapshots still cannot resurrect a deleted bookmark.
- Map: clusters are anchored at least one-eighth of the visible span apart, so markers no longer overlap. Tapping a cluster fits its members; places sharing a pin open as a list instead of requiring repeated zooms. Search in map view follows the results instead of resetting the camera.
- Check In and visit editing: a Done control dismisses the note keyboard, and scrolling dismisses it too. The tab bar stays behind the keyboard.
- Dynamic Type: Location Details, badges, cards and visit rows now scale. The tab bar keeps a fixed size with the large content viewer.
- Navigation: a swipe from the leading edge goes back from place details and category galleries.
- Smaller items: image requests serve the newest (on-screen) cards first; VoiceOver card labels include type, locality, distance and status; Near me can be turned off while locating; Locations and Browse tabs use distinct icons; "Added to Visited" copy; Near me card subtitles lead with distance and type; signed-out iCloud copy no longer promises the journal stays on the device.
- Verified: 15 core cases (XCTest and standalone), 3 device-service checks, iOS simulator build, desktop preview build, `npm test` 100 passed. Observed on the iPhone 17e simulator: separated clusters and fit-to-cluster, Denver search in map view, edge swipe back, note Done button, and accessibility XXXL text on Location Details.
- Not verified: VoiceOver with a screen reader running, iPad layout for these changes, and how NSPersistentCloudKitContainer treats local data after iCloud sign-out on a device.


## Usability follow-ups / build 4 — October 20, 2026

- Built PR #33 at `9dadd0b`, with the local build number incremented to 4. Includes map clustering, navigation, keyboard, Dynamic Type, image loading, and journal event compaction changes.
- Fifteen core/storage/clustering checks, three device-service checks, and four catalog/detail checks passed. Signed Release archive succeeded; Apple accepted version 0.1.0 (4) at 18:58 Pacific.
- Evidence: `.build/archive-build4.log` and `.build/upload-build4.log`. Physical-device iCloud compaction behavior and full VoiceOver/iPad validation of these changes remain unverified.
- Apple completed processing and assigned build 4 to the internal Test group. Testing notes saved. External review remains blocked by the pending build 1 review.


## Public catalog refresh — October 20, 2026

- Added `/api/v1/catalog.json` to the site build and an app refresh client with conditional HTTP requests, validated atomic caching, launch/foreground checks, and manual refresh. No public endpoint or new TestFlight build has been deployed for this change yet.
- Saved entries and open details resolve current metadata by ID/alias while journal snapshots remain untouched. Removed listings retain the saved snapshot.
- Core checks: 18 passed, including planned-to-open saved metadata, alias migration, journal preservation, 200/304 handling, restart cache, offline/server/invalid-response preservation, and corrupt-cache fallback. Website test/build: 101 passed and 628 generated pages plus the complete 546-place API feed.
- Universal iOS Release simulator build succeeded. On a separate disposable iPhone 17e simulator, saved a bundled coming-soon location; seeded a clearly labeled test-only cached update, relaunched, and observed updated Saved/detail name, status, and hours with the bookmark still selected. This is a fixture test, not an assertion that the real location opened.
- Observed Settings last-check time, manual refresh, and continued browsing after the still-unpublished endpoint failed. Production HTTP headers/response and physical-device behavior remain release checks.
- Final checks: XCTest ran all 18 cases successfully; signed device Release archive succeeded for build 5. No TestFlight upload was performed for the catalog feature.


## Catalog refresh review fixes — October 20, 2026

- Feed parsing is per record: unknown location types are dropped from a record, out-of-range pins become "no pin", and unreadable or identity-conflicting records are skipped. A response with half or more unusable records is rejected. Previously one unknown type or bad pin rejected the whole feed.
- A cached download older than the bundled directory (latest `checkedOn`) is deleted with its validators; an older server response doesn't replace the bundled directory.
- Automatic checks fail quietly; Settings shows the last failure, and browsing screens show it only after a manual refresh. Pull-to-refresh during an automatic check waits for it.
- Launch reads the cache once without re-encoding (about 70 ms to 34 ms on this Mac, release build). A damaged bundled directory no longer prevents the journal from opening.
- Verified: 20 core cases (XCTest and standalone), device-service checks, iOS simulator and desktop preview builds, `npm test` 101 passed. On the iPhone 17e simulator with the endpoint not yet deployed (HTTP 404): no notice after launch; the notice appeared after pull-to-refresh in Browse.

## Catalog revision ordering — October 20, 2026

- Replaced source-verification-date comparisons with an explicit catalog revision, generated from the complete export and persisted with its content digest in `data/catalog-revision.json`. Same-day edits and removals advance the revision; unchanged exports keep it. Scheduled refresh commits preserve the manifest.
- The refresh client rejects revisions older than either the bundle or its latest accepted download before writing data or HTTP validators. Revisionless caches fall back to the bundle. Source dates no longer control directory ordering.
- All 22 XCTest cases passed. The standalone runner subsequently passed all 22 cases including the added legacy-cache assertion. Regression coverage includes same-day edits, unchanged source dates, newer bundles, stale 200 responses, retained validators on the next 304, relaunch, missing/invalid revisions, and unchanged private journal data.
- All 102 website tests and the static build passed. The generated public and bundled catalogs match exactly, including their revision. The universal iOS simulator Release build passed; `git diff --check` passed.
- This revision has not been deployed or uploaded to TestFlight. The earlier build 5 archive predates this fix and must be rebuilt before distribution.

## Facades redesign / build 8 — October 21, 2026

- Merged PR #42 (Facades-style redesign and synced Base Camp) and bumped to version 0.2.0 (8).
- Before merge: 26 XCTest and standalone core cases, device-service checks, iOS simulator and desktop preview builds, and `npm test` (131) passed. Checked on iPhone 17 Pro and iPad Pro 11-inch simulators in light and dark mode.
- Signed Release archive succeeded. Apple accepted 0.2.0 (8) at 17:47 Pacific ("Upload succeeded"); processing was still pending when this was recorded.
- Not verified: two-device iCloud sync of Base Camp, VoiceOver, and physical-device behavior.

## Appearance and status fixes / build 9 — October 21, 2026

- Merged PR #43: visible Light/Dark/System control applied at the window so open sheets update immediately; current listings grouped as Listed (no "Unconfirmed"); repeated tags kept out of Site Feature browsing; public README description and `RELEASE_NOTES.md`.
- Before merge: 26 XCTest and standalone core cases passed; iOS simulator and desktop preview builds succeeded. On the iPhone 17 Pro simulator, Dark → System with Settings open switched the sheet to light immediately.
- Signed Release archive (build 9) succeeded. Apple accepted 0.2.0 (9) at 18:22 Pacific ("Upload succeeded"); processing was pending when recorded.
- Not verified: iPad layout for these changes, two-device Base Camp sync, VoiceOver.

## Settings rewrite / build 10 — October 21, 2026

- Merged PR #44: Settings as a standard grouped list (inline Light/Dark/System with its own footer, one setting per section), icon tiles that scale symbols to fit, and the public What's New rewrite.
- Checked on the iPhone 17 Pro simulator in light and dark; `test-core.sh` (26) passed; iOS simulator and desktop preview builds succeeded.
- Signed Release archive of `87e08b2` succeeded. Apple accepted 0.2.0 (10) at 18:37 Pacific ("Upload succeeded"); processing was pending when recorded.

## Settings design, category images / build 11 — October 21, 2026

- Merged PR #45: the previous Settings design restored with its fixes (one section per setting, fitted icon tiles, live appearance switching); Settings gear on Browse only; bundled RAN and Waypoint charger images for the 237 sites without their own photo, with no category label; the same images hosted at `/assets/charger-*.jpg` for the catalog feed; bundled catalog regenerated with October 21 data.
- Before merge: `npm test` 131 passed, `npm run build` succeeded, `test-core.sh` 26 passed, iOS simulator and desktop preview builds succeeded. PR CI failed only at `npm audit` because the npm audit endpoint returned 503/400 (registry outage), not from these changes.
- Signed Release archive of `193a935` succeeded. Apple accepted 0.2.0 (11) at 20:01 Pacific ("Upload succeeded"); processing was pending when recorded.

## Browse cleanup / build 12 — October 21, 2026

- Merged PR #46: removed the Settings gear from Browse (Settings remains the last Browse row and in the iPad sidebar) and removed the Site Feature section from Browse and the sidebar; feature pages stay reachable from chips, the glossary, and filters.
- PR CI passed; iOS simulator and desktop preview builds succeeded; checked Browse on the iPhone 17 Pro simulator.
- Signed Release archive of `f9f911d` succeeded. Apple accepted 0.2.0 (12) at 21:10 Pacific ("Upload succeeded"); processing was pending when recorded.

## Base Camp sidebar row / build 13 — October 21, 2026

- Merged PR #47: the Base Camp row keeps "Base Camp" on one line and shows the chosen place in full on the line below (no truncation), in the iPad/macOS sidebar and the iPhone Browse list.
- PR CI passed; iOS simulator and desktop preview builds succeeded; checked on the iPad Pro 11-inch simulator with a long Base Camp name.
- Signed Release archive of `66f20a4` succeeded. Apple accepted 0.2.0 (13) at 21:53 Pacific ("Upload succeeded"); processing was pending when recorded.

## Mac Settings fix / build 14 — October 21, 2026

- Merged PR #48: explicitly provide the shared store, location service, and sync status to sheets, fixing the missing environment object behind the Mac Settings crash. Includes the Base Camp row already merged through PR #47.
- 26 standalone core checks passed; iOS simulator and desktop preview builds succeeded. PR validation and release-source GitHub checks passed.
- Signed Release archive of `de5c64d` succeeded. Apple accepted 0.2.0 (14) at 22:08 Pacific. Processing completed; App Store Connect confirms the Internal group with one tester has access. The supplied two-item release notes were saved under What to Test.
- Build ID: `0e815c68-1673-4445-82b6-450d0413c980`. Actual Settings behavior in the installed Designed for iPad Mac app remains unverified.

## Version 1.0 beta / build 15 — October 21, 2026

- Merged PR #49 at `035823f`: privacy policy and footer links, 1.0 listing/screenshots, accessibility-size gallery and action-row layouts, and Debug-only screenshot routes. Archived PR head `ac69a77`; its tree matches the merge commit.
- 131 website tests and 26 standalone app checks passed. Static build generated 630 pages with all route/asset references resolving. iOS simulator, desktop preview, and signed Release archive builds succeeded.
- GitHub deployment run `39730435046` succeeded. Verified the public privacy page returns HTTP 200 and renders the new policy at https://rivianspotter.com/privacy.html.
- Apple accepted 1.0.0 (15) at 22:52 Pacific. Processing completed; the Internal group has one tester. Saved the Version 1.0 entry from `RELEASE_NOTES.md` as What to Test (plain text, preserving paragraphs) and the privacy URL in beta test information.
- Added the External group and submitted for beta review. App Store Connect confirms **Waiting for Review**; external testing is not approved yet. The External group currently has no testers.
- Build ID: `c6a1fdce-cd68-4550-b394-ea710e1d9f96`. Evidence is saved locally in `.build/testflight-build15-notes.png`, `.build/testflight-build15-review.png`, and `.build/privacy-live-build15.png`.
- No public App Store submission was made. VoiceOver execution and physical-device iCloud behavior were not independently retested in this release pass.

## Brand mark / build 16 — October 22, 2026

- Merged PR #53: the RivianSpotter route mark appears beside the app name in the iPad/Mac sidebar and in the top-left corner of each iPhone tab's first screen.
- PR CI passed; iOS simulator and desktop preview builds succeeded; checked on iPhone 17 Pro and iPad Pro 11-inch simulators in light and dark.
- Signed Release archive of `e6be7a9` succeeded. Apple accepted 1.0.0 (16) at 17:48 Pacific ("Upload succeeded"); processing was pending when recorded.

## Map gestures / build 17 — October 23, 2026

- Merged PR #58: a pinch that starts on a map marker now zooms the map, and returning from a place keeps the map's zoom and position instead of resetting to the full map.
- PR CI passed. Checked on the iPhone 17 Pro simulator: pinch centered on a cluster zoomed; tapping a cluster zoomed into it; opening Price, UT, going back, then opening nearby Big Mountain Lodge kept the same zoom throughout. iPad, Mac and VoiceOver were not retested.
- Signed Release archive of `0bad611` succeeded. Apple accepted 1.0.0 (17) at 13:07 Pacific ("Upload succeeded"); processing was pending when recorded.

## Check-in widget / build 18 — October 24, 2026

- Added small, medium and Lock Screen check-in widgets: on the Home Screen one tap logs a visit at the place you are at, otherwise the closest place is shown; the Lock Screen widget is info-only and opens the site's page (not tested on a device). Added the opt-in "Update widget when I arrive" setting. The journal now lives in the App Group. Updated the privacy page, Settings location footer, release notes and listing. Build number 18 in the app and widget targets; version stays 1.0.0.
- Core tests: 43 cases, 0 failures.
- Widget harness: 0 failures, covering a visit saved through the intent path, a double tap logging one visit, and the confirmation expiry.
- Simulator (iPhone 17 Pro), widget: showed Price, UT within 0.1 mi. Tapping Check In logged the visit ("✓ Checked In", "Visit #1") and the app's place page showed Visited. The journal moved to the App Group with the existing visit intact. Deep links place, nearby and location work.
- Simulator, arrival setting: with location-always granted it monitored 20 regions, and 0 once turned off. A background relaunch on region entry was logged. Permission tap-through: When-In-Use and then the Always prompt appeared with the new copy. Declining turned the toggle off with the Settings link, and a later Always grant re-enabled it.
- Not verified: physical device, iCloud sync of widget check-ins, the Mac "Designed for iPad" build, and VoiceOver.
- Merged PR #61. Signed Release archive of `eeffb71` succeeded with SpotterWidget.appex embedded and the App Group entitlement. Apple accepted 1.0.0 (18) at 12:59 Pacific ("Upload succeeded"); processing was pending when recorded.
- Device check by the maintainer on an iPhone, build 18: widget check-in synced through iCloud to their other devices; with arrival updates on, the widget offered Check In on arrival at about 0.2 mi from the site. Mac "Designed for iPad" and VoiceOver remain unverified.

## Widget copy / build 19 — October 24, 2026

- Merged PR #62: after a widget check-in the Home Screen widget shows only the place and "✓ Checked In" (no visit number or note hint). Widget harness 0 failures, core tests 43/0, simulator build succeeded.
- Signed Release archive of `c74672e` succeeded. Apple accepted 1.0.0 (19) at 14:05 Pacific ("Upload succeeded"); processing was pending when recorded.

## Name as two words / build 20 — October 25, 2026

- Merged PR #63: the app name reads "Rivian Spotter" under the Home Screen icon, in the Settings header and in the sidebar wordmark (iPad, Mac, iPhone landscape). Checked on iPad Pro 11-inch, iPhone 17 Pro Max landscape and iPhone 17 Pro Home Screen simulators.
- Signed Release archive of `fa009e8` succeeded. Apple accepted 1.0.0 (20) at 09:52 Pacific ("Upload succeeded"); processing was pending when recorded.

## Charlotte pin and Visited by Type / build 21 — October 25, 2026

- Merged PR #64: Charlotte, NC Service + Demo Center uses 9309 Monroe Road with the official service-map pin (detail page and service map agree, same ZIP and phone; the directory lists 3909). Its duplicate service-map entry merged in with old links kept; Dallas Service + Demo Center likewise gained an exact pin. `npm test` 158 pass.
- Merged PR #65: Lists → Visited by Type opens only your visits of that type. Checked on the iPhone 17 Pro simulator (RAN, Spaces, an empty type).
- Signed Release archive of `a5164ee` succeeded. Apple accepted 1.0.0 (21) at 10:33 Pacific ("Upload succeeded"); processing was pending when recorded.

## Service + Demo Centers / build 22 — October 25, 2026

- Merged PR #66: Demo Centers that offer service (68) are labeled "Service + Demo Center" on the website and in the app, and are browsed under both Demo Centers and Service Centers (Service Centers 42 to 108). Checked on the iPhone 17 Pro simulator; `npm test` 159 pass, core tests 44/0.
- Signed Release archive of `20a549b` succeeded. Apple accepted 1.0.0 (22) at 10:50 Pacific ("Upload succeeded"); processing was pending when recorded.

## iPad widget map / build 23 — October 25, 2026

- Merged PR #68: the medium widget map is requested at the device screen scale; MapKit rejected 3x on 2x iPads ("Invalid content scale: 3.0"), so iPad showed no map. Checked on the iPad Pro 13-inch simulator; widget harness 0 failures.
- Signed Release archive of `0d0e130` succeeded. Apple accepted 1.0.0 (23) at 14:12 Pacific ("Upload succeeded"); processing was pending when recorded.
