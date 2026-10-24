import Foundation
import WidgetKit

struct CheckInEntry: TimelineEntry {
    let date: Date
    let suggestion: CheckInSuggestion
    let lastVisit: Date?
    let visitCount: Int
    let justCheckedIn: Bool
    let failed: Bool
    let map: Data?
    /// Location permission is granted, so `.noUsableLocation` means a weak or stale fix, not "off".
    var locationAllowed = false
    /// When the "✓ Checked In" or failure line stops showing, if one is showing.
    var confirmationEnds: Date? = nil

    /// The entry for a suggestion: visit stats and the tap confirmation apply only when Check In is offered.
    static func make(_ suggestion: CheckInSuggestion, directory: URL?, defaults: UserDefaults?, map: Data? = nil,
                     locationAllowed: Bool = false, now: Date = Date()) -> CheckInEntry {
        guard case .nearby(let place, _, _) = suggestion, let directory else {
            return CheckInEntry(date: now, suggestion: suggestion, lastVisit: nil, visitCount: 0,
                                justCheckedIn: false, failed: false, map: map, locationAllowed: locationAllowed)
        }
        let visits = WidgetStore.visits(to: place, in: directory)
        let checkedAt = WidgetStore.recentTime(WidgetStore.lastCheckInKey, for: place, defaults: defaults, now: now)
        let failedAt = checkedAt == nil
            ? WidgetStore.recentTime(WidgetStore.failedKey, for: place, defaults: defaults, now: now) : nil
        return CheckInEntry(date: now, suggestion: suggestion, lastVisit: visits.first?.visitedAt, visitCount: visits.count,
                            justCheckedIn: checkedAt != nil, failed: failedAt != nil, map: map,
                            locationAllowed: locationAllowed,
                            confirmationEnds: (checkedAt ?? failedAt)?.addingTimeInterval(WidgetStore.confirmation))
    }

    /// The same widget once the confirmation has ended: Check In returns.
    var afterConfirmation: CheckInEntry? {
        guard let confirmationEnds else { return nil }
        return CheckInEntry(date: confirmationEnds, suggestion: suggestion, lastVisit: lastVisit, visitCount: visitCount,
                            justCheckedIn: false, failed: false, map: map, locationAllowed: locationAllowed)
    }

    static var placeholder: CheckInEntry { GallerySample.entry(places: []) }
}

/// The widget gallery's example: Price, UT, a site you've visited before. Taken from the snapshot
/// when it's there, so the tap opens the real page.
enum GallerySample {
    static func entry(places: [Place]) -> CheckInEntry {
        let place = places.first { $0.name == "Price, UT" } ?? Self.place, now = Date()
        return CheckInEntry(date: now, suggestion: .nearby(place, meters: 160, alsoNearby: false),
                            lastVisit: now.addingTimeInterval(-22 * 86_400), visitCount: 3,
                            justCheckedIn: false, failed: false, map: nil)
    }

    static let place: Place = {
        let json = #"""
        {"id":"96922781711411","aliases":[],"slug":"ran-price-ut-582697ea39","name":"Price, UT",
         "directoryTypes":["RAN"],"types":["RAN"],"city":"Price","region":"UT","country":"US",
         "latitude":39.601158245016876,"longitude":-110.82203149795532,"coordinatePrecision":"map-pin",
         "status":"unknown","listed":true}
        """#
        return try! JSONDecoder().decode(Place.self, from: Data(json.utf8))
    }()
}

struct CheckInProvider: TimelineProvider {
    func placeholder(in context: Context) -> CheckInEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (CheckInEntry) -> Void) {
        // The gallery shows a fixed example and doesn't ask for location.
        if context.isPreview {
            let directory = try? SharedStore.directory()
            completion(GallerySample.entry(places: directory.map { PlacesSnapshot.read(from: $0) } ?? []))
            return
        }
        Task { completion(await Self.load(withMap: false)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CheckInEntry>) -> Void) {
        let medium = context.family == .systemMedium
        Task {
            let entry = await Self.load(withMap: medium)
            // A second entry ends the confirmation on time, even if the next reload comes late.
            let entries = [entry] + [entry.afterConfirmation].compactMap { $0 }
            completion(Timeline(entries: entries, policy: .after(entry.date.addingTimeInterval(15 * 60))))
        }
    }

    /// One reload: read the snapshot, take one location fix, read the journal, and for the
    /// medium size make one map picture.
    static func load(withMap: Bool) async -> CheckInEntry {
        guard let directory = try? SharedStore.directory() else { return .make(.noPlaces, directory: nil, defaults: nil) }
        let places = PlacesSnapshot.read(from: directory)
        let location = places.isEmpty ? (fix: nil, allowed: false) : await WidgetLocation.fix()
        let suggestion = CheckInSuggestion.make(places: places, fix: location.fix, now: Date())
        var map: Data?
        if withMap, let fix = location.fix {
            switch suggestion {
            case .nearby(let place, _, _), .closest(let place, _):
                map = await MapSnapshot.make(from: fix, to: place, size: MapSnapshot.mediumSize, scale: 3)
            default: break
            }
        }
        return .make(suggestion, directory: directory, defaults: WidgetStore.defaults, map: map,
                     locationAllowed: location.allowed)
    }
}
