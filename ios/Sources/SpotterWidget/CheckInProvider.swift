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

    /// The entry for a suggestion: visit stats and the tap confirmation apply only when Check In is offered.
    static func make(_ suggestion: CheckInSuggestion, directory: URL?, defaults: UserDefaults?, map: Data? = nil,
                     now: Date = Date()) -> CheckInEntry {
        guard case .nearby(let place, _, _) = suggestion, let directory else {
            return CheckInEntry(date: now, suggestion: suggestion, lastVisit: nil, visitCount: 0,
                                justCheckedIn: false, failed: false, map: map)
        }
        let visits = WidgetStore.visits(to: place, in: directory)
        let checkedIn = WidgetStore.isRecent(WidgetStore.lastCheckInKey, for: place, defaults: defaults, now: now)
        let failed = !checkedIn && WidgetStore.isRecent(WidgetStore.failedKey, for: place, defaults: defaults, now: now)
        return CheckInEntry(date: now, suggestion: suggestion, lastVisit: visits.first?.visitedAt, visitCount: visits.count,
                            justCheckedIn: checkedIn, failed: failed, map: map)
    }

    static let placeholder = CheckInEntry(date: Date(), suggestion: .noPlaces, lastVisit: nil, visitCount: 0,
                                          justCheckedIn: false, failed: false, map: nil)
}

struct CheckInProvider: TimelineProvider {
    func placeholder(in context: Context) -> CheckInEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (CheckInEntry) -> Void) {
        // The widget gallery shows the first snapshot place as an example, without asking for location.
        if context.isPreview {
            let directory = try? SharedStore.directory()
            let place = directory.flatMap { PlacesSnapshot.read(from: $0).first }
            let suggestion: CheckInSuggestion = place.map { .nearby($0, meters: 160, alsoNearby: false) } ?? .noPlaces
            completion(CheckInEntry(date: Date(), suggestion: suggestion, lastVisit: nil, visitCount: 0,
                                    justCheckedIn: false, failed: false, map: nil))
            return
        }
        Task { completion(await Self.load(withMap: false)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CheckInEntry>) -> Void) {
        let medium = context.family == .systemMedium
        Task {
            let entry = await Self.load(withMap: medium)
            completion(Timeline(entries: [entry], policy: .after(entry.date.addingTimeInterval(15 * 60))))
        }
    }

    /// One reload: read the snapshot, take one location fix, read the journal, and for the
    /// medium size make one map picture.
    static func load(withMap: Bool) async -> CheckInEntry {
        guard let directory = try? SharedStore.directory() else { return .make(.noPlaces, directory: nil, defaults: nil) }
        let places = PlacesSnapshot.read(from: directory)
        let fix = places.isEmpty ? nil : await WidgetLocation.fix()
        let suggestion = CheckInSuggestion.make(places: places, fix: fix, now: Date())
        var map: Data?
        if withMap, let fix {
            switch suggestion {
            case .nearby(let place, _, _), .closest(let place, _):
                map = await MapSnapshot.make(from: fix, to: place, size: MapSnapshot.mediumSize, scale: 3)
            default: break
            }
        }
        return .make(suggestion, directory: directory, defaults: WidgetStore.defaults, map: map)
    }
}
