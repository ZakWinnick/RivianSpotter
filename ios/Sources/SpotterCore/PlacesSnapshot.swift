import Foundation

/// The places the check-in widget may offer, written by the app into the shared folder so the
/// widget never downloads anything.
public enum PlacesSnapshot {
    static let fileName = "widget-places.json"

    public static func write(_ places: [Place], to directory: URL) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(places.filter(\.isCheckable))
        let url = directory.appendingPathComponent(fileName)
        // Until first unlock, not complete protection: the widget reads while the phone is locked.
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }

    /// Withdraws the snapshot, so the widget offers no check-ins when the app isn't using the shared journal.
    public static func remove(from directory: URL) {
        try? FileManager.default.removeItem(at: directory.appendingPathComponent(fileName))
    }

    /// An empty list when the file is missing or unreadable.
    public static func read(from directory: URL) -> [Place] {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent(fileName)) else { return [] }
        return (try? JSONDecoder().decode([Place].self, from: data)) ?? []
    }
}
