// A macOS command-line check for the widget, built only by Tools/widget-harness.sh, never by the
// app or the widget target. It runs the widget's check-in path against a temporary journal and
// renders every widget state to PNGs with ImageRenderer.
import SwiftUI
import ImageIO
import UniformTypeIdentifiers

@main
@MainActor
struct WidgetHarness {
    static var failures = 0
    static func check(_ condition: Bool, _ message: String) {
        print((condition ? "ok   " : "FAIL ") + message)
        if !condition { failures += 1 }
    }

    static func main() async throws {
        let args = CommandLine.arguments
        guard args.count == 4 else { print("usage: harness <catalog.json> <BrandMark.png> <output dir>"); exit(2) }
        let catalog = try Catalog.validated(Data(contentsOf: URL(fileURLWithPath: args[1])))
        WidgetBrandMark.override = image(at: URL(fileURLWithPath: args[2]))
        let output = URL(fileURLWithPath: args[3], isDirectory: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)

        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("widget-harness-\(UUID().uuidString)")
        let suite = "widget-harness-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { try? FileManager.default.removeItem(at: folder); defaults.removePersistentDomain(forName: suite) }

        // The shared folder as the app leaves it: a snapshot and a journal with three earlier visits.
        try PlacesSnapshot.write(catalog.places, to: folder)
        let places = PlacesSnapshot.read(from: folder)
        let price = places.first { $0.name == "Price, UT" }!
        let now = Date()
        do {
            let seed = try JournalRepository(storage: CloudJournalStorage(url: WidgetStore.journalURL(in: folder), cloudEnabled: false))
            for days in [90.0, 50, 21] {
                try seed.checkIn(at: price, type: .ran, date: now.addingTimeInterval(-days * 86_400), note: "seed")
            }
        }
        func fix(_ lat: Double, _ lon: Double, precise: Bool = true) -> LocationFix {
            LocationFix(latitude: lat, longitude: lon, horizontalAccuracy: 10, timestamp: now, isPrecise: precise)
        }
        let atPrice = fix(price.latitude! + 0.0012, price.longitude!)          // about 130 m north
        let farAway = fix(39.25, -111.13)                                         // about 11 mi from Big Mountain Lodge
        func entry(_ suggestion: CheckInSuggestion, map: Data? = nil) -> CheckInEntry {
            .make(suggestion, directory: folder, defaults: defaults, map: map, now: now)
        }

        // States before the check-in.
        let atSite = CheckInSuggestion.make(places: places, fix: atPrice, now: now)
        check({ if case .nearby(let p, _, false) = atSite { return p.id == price.id }; return false }(), "at Price → nearby Price")
        let before = entry(atSite)
        check(before.visitCount == 3 && !before.justCheckedIn, "before check-in: 3 visits, no confirmation")
        check(CheckInCopy(entry: before).visitLine == "Last visit 3 weeks ago", "visit line: \(CheckInCopy(entry: before).visitLine)")
        let closest = CheckInSuggestion.make(places: places, fix: farAway, now: now)
        check({ if case .closest(let p, _) = closest { return p.name == "Big Mountain Lodge" }; return false }(), "far away → closest Big Mountain Lodge")
        let locationOff = CheckInSuggestion.make(places: places, fix: nil, now: now)
        let preciseOff = CheckInSuggestion.make(places: places, fix: fix(39.6, -110.8, precise: false), now: now)
        let noSnapshot = CheckInSuggestion.make(places: [], fix: atPrice, now: now)
        check(locationOff == .noUsableLocation && preciseOff == .needsPreciseLocation && noSnapshot == .noPlaces, "location states")
        check(WidgetLink.url(for: atSite)?.absoluteString == "rivianspotter://place/\(price.id)", "tap opens the place page")
        check(WidgetLink.url(for: locationOff)?.absoluteString == "rivianspotter://location", "location off opens location")

        let alsoNearby = CheckInSuggestion.nearby(price, meters: 130, alsoNearby: true)
        check(WidgetLink.lockURL(for: alsoNearby)?.absoluteString == "rivianspotter://place/\(price.id)", "lock: nearby with alsoNearby opens the place page")
        check(WidgetLink.url(for: alsoNearby)?.absoluteString == "rivianspotter://nearby", "home: alsoNearby keeps nearby routing")
        if case .closest(let lodge, _) = closest {
            check(WidgetLink.lockURL(for: closest)?.absoluteString == "rivianspotter://place/\(lodge.id)", "lock: closest opens the place page")
        }
        check(WidgetLink.lockURL(for: locationOff)?.absoluteString == "rivianspotter://location" && WidgetLink.lockURL(for: preciseOff)?.absoluteString == "rivianspotter://location", "lock: location states open location")
        check(WidgetLink.lockURL(for: noSnapshot) == nil, "lock: no snapshot has no URL")
        check(CheckInCopy(entry: before).lockVisitLine == "Last visit 3w ago", "lock visit line: \(CheckInCopy(entry: before).lockVisitLine)")
        let skewed = CheckInEntry(date: now, suggestion: atSite, lastVisit: now.addingTimeInterval(3600), visitCount: 1,
                                  justCheckedIn: false, failed: false, map: nil)
        check(CheckInCopy(entry: skewed).lockVisitLine == "Last visit just now", "lock visit line, future-dated: \(CheckInCopy(entry: skewed).lockVisitLine)")

        // The map, made the way the medium widget makes it.
        let map = await MapSnapshot.make(from: atPrice, to: price, size: MapSnapshot.mediumSize, scale: 3)
        check(map != nil, "map snapshot made (\(map?.count ?? 0) bytes)")
        let closestMap: Data?
        if case .closest(let lodge, _) = closest {
            closestMap = await MapSnapshot.make(from: farAway, to: lodge, size: MapSnapshot.mediumSize, scale: 3)
        } else { closestMap = nil }

        try render(before, .small, "small-1-at-site", to: output)
        try render(entry(closest), .small, "small-3-nothing-close", to: output)
        try render(entry(locationOff), .small, "small-4-location-off", to: output)
        try render(entry(preciseOff), .small, "small-5-precise-off", to: output)
        try render(entry(noSnapshot), .small, "small-6-no-snapshot", to: output)
        try render(entry(atSite, map: map), .medium, "medium-1-at-site-map", to: output)
        try render(entry(closest, map: closestMap), .medium, "medium-2-nothing-close-map", to: output)
        try render(before, .medium, "medium-3-fallback-no-map", to: output)
        try render(entry(locationOff), .medium, "medium-4-location-off", to: output)
        try render(before, .lock, "lock-1-at-site", to: output)
        try render(entry(closest), .lock, "lock-2-nothing-close", to: output)
        try render(entry(locationOff), .lock, "lock-3-location-off", to: output)
        let unavailable = CheckInEntry.make(locationOff, directory: folder, defaults: defaults, locationAllowed: true, now: now)
        try render(unavailable, .small, "small-8-location-unavailable", to: output)
        try render(unavailable, .medium, "medium-6-location-unavailable", to: output)
        try render(unavailable, .lock, "lock-5-location-unavailable", to: output)
        check(WidgetLink.url(for: locationOff)?.absoluteString == "rivianspotter://location", "unavailable opens location")

        // The gallery example: Price, UT from the snapshot, or the built-in copy without one.
        let gallery = GallerySample.entry(places: places), builtIn = GallerySample.entry(places: [])
        check({ if case .nearby(let p, _, _) = gallery.suggestion { return p.id == price.id }; return false }(), "gallery uses the snapshot's Price, UT")
        check({ if case .nearby(let p, _, _) = builtIn.suggestion { return p.id == price.id && p.isCheckable }; return false }(), "built-in gallery sample is Price, UT")
        check(CheckInCopy(entry: builtIn).visitLine == "Last visit 3 weeks ago", "gallery line: \(CheckInCopy(entry: builtIn).visitLine)")
        try render(builtIn, .small, "gallery-small", to: output)
        try render(builtIn, .medium, "gallery-medium", to: output)
        try render(CheckInEntry.placeholder, .small, "gallery-placeholder-small", to: output)

        // The intent's check-in path.
        check(WidgetStore.checkIn(placeID: price.id, in: folder, defaults: defaults, now: now), "check-in succeeds")
        check(WidgetStore.checkIn(placeID: price.id, in: folder, defaults: defaults, now: now.addingTimeInterval(1)),
              "a second tap right after reports success")
        let reopened = try CloudJournalStorage(url: WidgetStore.journalURL(in: folder), cloudEnabled: false).load()
        let visits = reopened.visits(to: price)
        check(visits.count == 4, "two taps in a row log one visit: 4 visits to Price (\(visits.count))")
        check(visits.first.map { $0.type == .ran && $0.note.isEmpty && abs($0.visitedAt.timeIntervalSince(now)) < 1 } ?? false,
              "newest visit: RAN, no note, now")
        let after = entry(atSite)
        check(after.justCheckedIn && after.visitCount == 4 && !after.failed, "confirmation recorded (journal has 4 visits)")
        check(CheckInCopy(entry: after).visitLine.isEmpty, "checked in: no subtitle (\(CheckInCopy(entry: after).visitLine))")
        try render(after, .small, "small-2-checked-in", to: output)
        try render(entry(atSite, map: map), .medium, "medium-5-checked-in-map", to: output)
        try render(after, .lock, "lock-4-checked-in", to: output)
        let later = CheckInEntry.make(atSite, directory: folder, defaults: defaults, now: now.addingTimeInterval(16 * 60))
        check(!later.justCheckedIn && CheckInCopy(entry: later).visitLine == "Last visit just now", "after 15 min: Check In with Last visit just now")
        // The timeline's second entry ends the confirmation exactly 15 minutes after the tap.
        let reloadedLater = CheckInEntry.make(atSite, directory: folder, defaults: defaults, now: now.addingTimeInterval(5 * 60))
        let expiry = reloadedLater.afterConfirmation
        check(reloadedLater.justCheckedIn && abs((expiry?.date ?? .distantPast).timeIntervalSince(now.addingTimeInterval(15 * 60))) < 0.001, "expiry entry at tap + 15 min")
        check(expiry.map { !$0.justCheckedIn && CheckInCopy(entry: $0).visitLine == "Last visit just now" } ?? false,
              "expiry entry shows Check In with Last visit just now")
        check(entry(closest).afterConfirmation == nil, "no expiry entry without a confirmation")
        try render(expiry!, .small, "small-9-after-confirmation", to: output)
        let unread = CheckInEntry(date: now, suggestion: atSite, lastVisit: nil, visitCount: 0, justCheckedIn: true, failed: false, map: nil)
        check(CheckInCopy(entry: unread).visitLine.isEmpty, "checked in, journal unreadable: no subtitle")
        try render(unread, .small, "small-10-checked-in-no-count", to: output)

        // A failed check-in claims nothing.
        check(!WidgetStore.checkIn(placeID: "no-such-place", in: folder, defaults: defaults, now: now), "unknown place fails")
        check(defaults.dictionary(forKey: WidgetStore.failedKey) != nil, "failure recorded")
        let unchanged = try CloudJournalStorage(url: WidgetStore.journalURL(in: folder), cloudEnabled: false).load()
        check(unchanged.visits.count == 4, "failed check-in leaves the journal alone")
        let empty = FileManager.default.temporaryDirectory.appendingPathComponent("widget-harness-empty-\(UUID().uuidString)")
        try PlacesSnapshot.write(catalog.places, to: empty)
        let freshSuite = "widget-harness-\(UUID().uuidString)", fresh = UserDefaults(suiteName: freshSuite)!
        defer { fresh.removePersistentDomain(forName: freshSuite) }
        check(!WidgetStore.checkIn(placeID: price.id, in: empty, defaults: fresh, now: now), "no shared journal → fails")
        check(!FileManager.default.fileExists(atPath: WidgetStore.journalURL(in: empty).path), "and creates no journal")
        try? FileManager.default.removeItem(at: empty)
        let failedEntry = entry(atSite)
        try render(CheckInEntry(date: now, suggestion: atSite, lastVisit: failedEntry.lastVisit, visitCount: 4,
                                justCheckedIn: false, failed: true, map: nil), .small, "small-7-check-in-failed", to: output)

        print(failures == 0 ? "0 failures" : "\(failures) failures")
        exit(failures == 0 ? 0 : 1)
    }

    static func image(at url: URL) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(source, 0, nil)
    }

    /// Draws one state at iPhone 17 Pro widget sizes, on the widget's surface (or a Lock Screen stand-in).
    static func render(_ entry: CheckInEntry, _ layout: WidgetLayout, _ name: String, to folder: URL) throws {
        let size: CGSize = switch layout {
        case .small: CGSize(width: 170, height: 170)
        case .medium: CGSize(width: 364, height: 170)
        case .lock: CGSize(width: 172, height: 76)
        }
        let content = CheckInWidgetView(entry: entry, layout: layout)
            .frame(width: size.width, height: size.height)
            .background(layout == .lock ? Color.black : WidgetPalette.surface)
            .clipShape(RoundedRectangle(cornerRadius: layout == .lock ? 12 : 22, style: .continuous))
            .foregroundStyle(layout == .lock ? Color.white : Color.primary)
            .environment(\.colorScheme, .dark)
            .padding(12).background(Color(white: 0.3))
        let renderer = ImageRenderer(content: content)
        renderer.scale = 3
        guard let image = renderer.cgImage else { throw CocoaError(.fileWriteUnknown) }
        let url = folder.appendingPathComponent("\(name).png")
        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            throw CocoaError(.fileWriteUnknown)
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { throw CocoaError(.fileWriteUnknown) }
        print("wrote \(url.path)")
    }
}
