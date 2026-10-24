# Check-in widget design

## Why

Checking in should not require opening the app. Modeled on Foursquare Swarm's widget: it finds the Rivian place you're at and offers one-tap check-in. Notes are added later in the app.

## What the person sees

### Home Screen widget (small)

The approved mockup (`assets/2026-10-24-checkin-widget-mockup.png`) shows four states. It was rendered in Helvetica; the real widget uses SF Pro. The widget uses the app's system font (SF Pro via `.system`), its dark forest-green surface (`#1b2620`-ish), the mint button color (`GuidePalette.yellow`, `#d8e7db`) on forest (`#244e3c`), and the place-type color dots from `PlaceType.mapColorHex`. The top-right mark is the app's real route mark (`BrandMark`), not the mockup's "S".

1. **At a site** (closest checkable place within ¼ mile, about 400 m): a type dot, the type and distance ("RAN · 0.1 mi"), the place's `guideName` as the title (two lines, no truncation beyond that), then "Last visit 3 weeks ago" or "First visit" when there is none. A **Check In** button logs the visit without opening the app. A round **refresh** button re-checks location.
2. **Right after checking in:** the button becomes "✓ Checked In" and the subtitle reads "Visit #4 · Add a note in the app". There's no limit on how many times you can check in. The confirmation shows until the next refresh, then Check In returns, with "Last visit just now". *(The length of the confirmation is my call.)*
3. **Nothing within ¼ mile:** the top line reads "No nearby site", the title is the closest place, and the subtitle shows its type and distance ("Waypoint · 12 mi away"). There is no Check In button. Tapping the widget opens that place's page.
4. **No usable location:** this covers no permission, and also Precise Location being off, a fix with horizontal accuracy worse than 100 m, or a fix older than 10 minutes. Those can be off by miles, so a ¼-mile test would log false visits. With permission granted but precision off, the copy reads "Turn on Precise Location to check in" instead. *(My call.)*
   **No location permission:** "Location off" with "Allow location to find sites near you" and an **Open RivianSpotter** button. It deep-links to the app, where the existing location request runs.

**Several sites close by:** the widget suggests only the closest one, as Swarm does. To check in somewhere else, you open the app and pick the right place. When another checkable place is also within ¼ mile, tapping the widget body opens the app's map with Near Me on, nearest first, instead of the closest place's page. *(The routing is my call.)*

The widget surface stays dark in both light and dark mode, like Swarm's. *(My call.)*

Tapping the widget outside the buttons opens the shown place's page in the app (states 1–3).

### Home Screen widget (medium)

This follows Swarm's medium widget, which the user shared as a reference. The left half holds the same content and buttons as the small widget. The right half is a static map image (`MKMapSnapshotter`, rendered when the timeline reloads) centered between your location and the shown place. It shows a blue dot for you, the place's marker in its type color, and the app's dark map styling, and it fades into the left half. The refresh button sits at the bottom right, over the map. When location is off, or if the snapshot fails, the medium widget falls back to the small layout stretched across the width. Widgets can't show a live map, so this is a picture that updates with each reload.

### Lock Screen widget

`accessoryRectangular`: one line with the place name, and a second line with "Check In" (interactive) or "✓ Checked In", or "Nearest: Big Mountain Lodge · 12 mi" when nothing is close. Location off shows "Open RivianSpotter to allow location". It uses the system's lock-screen rendering, so it carries no colors of its own.

## Which places count

Mapped places from the live catalog (`Place.hasMapCoordinates`), listed (`listed != false`), with `status` either `"open"` or `"unknown"`. `"unknown"` is what every RAN and Waypoint uses; the app shows it as "Listed by Rivian". Excluded: `planned` (coming soon), `temporarily-closed`, `closed`, and places no longer listed. They are skipped when choosing the closest place, the "Nearest" fallback and the monitored regions. *(My call: a temporarily closed site isn't offered.)* A check-in records the place's primary type (`browseTypes.first`), matching how the app logs a check-in from a place page. *(Builder's call: check what the place page passes today and use the same.)*

## Refresh

- **Scheduled, for everyone:** the timeline asks to reload about every 15 minutes. iOS decides the actual timing and budget. The widget gets its location at reload, using the app's When-In-Use permission (`NSWidgetWantsLocation`).
- **Refresh button:** an App Intent that reloads the widget's timeline at once.
- **Arrival detection, opt-in:** a new Settings toggle, "Update widget when I arrive", off by default. Turning it on explains what it does in plain words and requests Always location. When granted, the app monitors the nearest 20 checkable places as ~400 m regions, plus significant-location changes so the set follows you as you travel. Entering a region wakes the app briefly, which reloads the widget. Turning the toggle off, or permission being downgraded, stops all monitoring. Nothing about location is stored or sent anywhere.

## How it fits the existing app

- **New target:** a WidgetKit extension (iOS 17+), embedded in the iPhone/iPad app. It isn't needed for the Mac ("Designed for iPad") build.
- **Shared App Group** (`group.com.rivianspotter.app`) for the app and the extension. Both read and write the same journal, and the widget reads a places snapshot from it.
- **Journal moves into the App Group** (the user's decision, since there are no testers right now). On first launch of the new build, the app moves `journal.sqlite` and its companion files from Application Support into the group container with `NSPersistentStoreCoordinator.replacePersistentStore` (or `migratePersistentStore`). It verifies the visit count matches before deleting the old files, and keeps the old store if anything fails. CloudKit mirroring stays with the app. The extension opens the same store with persistent history tracking on and no CloudKit options, so the app's mirror exports widget check-ins the next time it runs. The app also merges remote-change notifications, so a widget check-in appears immediately if the app is open. Consequence: a widget check-in reaches iCloud and other devices when the app next runs on that phone, including an arrival-detection wake.
- **Places snapshot**, written by the app: full `Place` records for checkable places, rewritten whenever the catalog loads or updates, so the widget never downloads anything.
- **Writing the visit:** the widget's Check In intent calls `JournalRepository.checkIn` directly on the shared journal, with an empty note. "Last visit…" and "Visit #N" come from the journal itself. If the save fails, the widget says "Couldn't check in. Open RivianSpotter." and claims nothing.
- **Deep links:** a URL scheme (for example `rivianspotter://place/<id>`) routed to the existing place page, plus a link that opens the app to request location.
- **Location permission string:** `NSLocationWhenInUseUsageDescription` currently says location is used "when you tap Near me". Update it to also mention the widget, and add `NSLocationAlwaysAndWhenInUseUsageDescription` for the opt-in.
- **Privacy:** location stays on the device, and nothing new is collected. Update the privacy page (`privacy.html` via `scripts/build-pages.cjs`), `PrivacyInfo.xcprivacy` if required, and `ios/RELEASE_NOTES.md`.

## Goals

- Log a visit in one tap from the Home Screen or Lock Screen when you're at a place.
- When you're not at a place, show the closest one and how far it is.
- Optionally update automatically as you arrive.

## Non-goals

- Adding notes, photos or editing visits from the widget.
- The large Home Screen size, StandBy layouts, Live Activities, Apple Watch.
- Checking in at coming-soon sites.

## Anti-goals

- Losing, duplicating or silently dropping a visit, including during the journal move.
- Tracking location by default, or storing or sending location anywhere.
- A widget that claims "Checked In" when the visit wasn't saved.

## Verification

- Unit tests (SpotterCore): choosing the closest checkable place, the ¼-mile threshold, skipping coming-soon sites, the journal move (counts match, old store kept on failure), and a widget-process check-in that the app sees.
- In the simulator: each widget state and the lock-screen widget; a widget check-in followed by opening the app shows the visit; the opt-in toggle on and off.
- Build number bump and TestFlight upload, following the existing process.
