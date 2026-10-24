import Foundation

/// The widget's reads and writes in the shared folder. Foundation only, so the harness in
/// `Tools/WidgetHarness.swift` runs exactly what the widget runs.
enum WidgetStore {
    static let kind = "CheckInWidget"
    static let lastCheckInKey = "widget.lastCheckIn", failedKey = "widget.lastCheckInFailed"
    /// How long "✓ Checked In" (or the failure line) shows after a tap.
    static let confirmation: TimeInterval = 15 * 60

    static var defaults: UserDefaults? { UserDefaults(suiteName: SharedStore.groupID) }

    static func journalURL(in directory: URL) -> URL { directory.appendingPathComponent("journal.sqlite") }

    /// Visits to one place, newest first. A journal that isn't there yet means no visits; reading
    /// never creates one.
    static func visits(to place: Place, in directory: URL) -> [Visit] {
        let url = journalURL(in: directory)
        guard FileManager.default.fileExists(atPath: url.path),
              let storage = try? CloudJournalStorage(url: url, cloudEnabled: false),
              let journal = try? storage.load() else { return [] }
        return journal.visits(to: place)
    }

    /// Logs a visit to a snapshot place with its primary type and no note, the way the place page
    /// does, then records the confirmation. On any failure it records the failure and claims nothing.
    @discardableResult
    static func checkIn(placeID: String, in directory: URL, defaults: UserDefaults?, now: Date = Date()) -> Bool {
        do {
            guard let place = PlacesSnapshot.read(from: directory).first(where: { $0.id == placeID || $0.aliases.contains(placeID) }),
                  let type = place.types.first else { throw CocoaError(.fileNoSuchFile) }
            // The app creates the shared journal; one missing here means the app isn't reading it.
            let url = journalURL(in: directory)
            guard FileManager.default.fileExists(atPath: url.path) else { throw CocoaError(.fileNoSuchFile) }
            let repository = try JournalRepository(storage: CloudJournalStorage(url: url, cloudEnabled: false))
            try repository.checkIn(at: place, type: type, date: now, note: "", now: now)
            defaults?.set(["placeID": place.id, "at": now.timeIntervalSince1970], forKey: lastCheckInKey)
            defaults?.removeObject(forKey: failedKey)
            return true
        } catch {
            defaults?.set(["placeID": placeID, "at": now.timeIntervalSince1970], forKey: failedKey)
            return false
        }
    }

    /// Whether `key` names this place and was written within the confirmation window.
    static func isRecent(_ key: String, for place: Place, defaults: UserDefaults?, now: Date) -> Bool {
        guard let value = defaults?.dictionary(forKey: key), let id = value["placeID"] as? String,
              let at = value["at"] as? Double else { return false }
        let age = now.timeIntervalSince1970 - at
        return (id == place.id || place.aliases.contains(id)) && age >= 0 && age < confirmation
    }
}
