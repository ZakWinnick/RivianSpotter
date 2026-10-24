import Foundation

public struct Visit: Codable, Identifiable, Equatable, Sendable {
    public let id: UUID
    // Retain the place as it was when visited, even if the public listing disappears.
    public let place: Place
    public let type: PlaceType
    public var visitedAt: Date
    public var note: String
}

public struct Journal: Codable, Equatable, Sendable {
    public var schemaVersion = 1
    public var visits: [Visit] = []
    public var savedPlaces: [Place] = []
    /// The person's chosen home location. Optional so earlier journals and exports still decode.
    public var baseCamp: Place? = nil
    public init() {}
    public var uniquePlaceCount: Int { Set(visits.map { $0.place.id }).count }
    public func count(for type: PlaceType) -> Int {
        Set(visits.filter { $0.type == type }.map { $0.place.id }).count
    }
}

public extension Journal {
    /// Visits to a place, newest first. Matches by ID or alias in either direction, so visits still
    /// count after a listing is renumbered.
    func visits(to place: Place) -> [Visit] {
        let ids = Set([place.id] + place.aliases)
        return visits.filter { !ids.isDisjoint(with: [$0.place.id] + $0.place.aliases) }
            .sorted { $0.visitedAt > $1.visitedAt }
    }
}

public enum JournalError: LocalizedError {
    case futureDate, invalidType, noteTooLong, unreadable, unknownVisit
    public var errorDescription: String? {
        switch self {
        case .futureDate: "Choose today or a past visit date."
        case .invalidType: "Choose one of this place’s location types."
        case .noteTooLong: "Keep your note under 4,000 characters."
        case .unreadable: "Your visit file could not be read. It has been left untouched. Restore a backup before recording new visits."
        case .unknownVisit: "This visit could not be found."
        }
    }
}

public protocol JournalStorage: AnyObject {
    var url: URL { get }
    func load() throws -> Journal
    func save(_ next: Journal, replacing previous: Journal) throws
    /// Records kept in storage but left out of the last load because they could not be read.
    var unreadableRecordCount: Int { get }
}

public extension JournalStorage {
    var unreadableRecordCount: Int { 0 }
}

public final class JSONJournalStorage: JournalStorage {
    public let url: URL
    public init(url: URL) { self.url = url }
    public func load() throws -> Journal {
        guard FileManager.default.fileExists(atPath: url.path) else { return Journal() }
        do {
            let decoded = try JSONDecoder().decode(Journal.self, from: Data(contentsOf: url))
            guard decoded.schemaVersion == 1,
                  Set(decoded.visits.map(\.id)).count == decoded.visits.count,
                  Set(decoded.savedPlaces.map(\.id)).count == decoded.savedPlaces.count,
                  decoded.visits.allSatisfy({ $0.place.types.contains($0.type) }) else { throw JournalError.unreadable }
            return decoded
        } catch { throw JournalError.unreadable }
    }
    public func save(_ next: Journal, replacing previous: Journal) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(next)
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }
}

// Failed writes never appear as successful check-ins. Reload before each mutation
// so an imported change is included even if the screen has not refreshed yet.
public final class JournalRepository {
    public private(set) var journal: Journal
    private let storage: JournalStorage
    public var fileURL: URL { storage.url }
    public var unreadableRecordCount: Int { storage.unreadableRecordCount }
    public convenience init(fileURL: URL) throws { try self.init(storage: JSONJournalStorage(url: fileURL)) }
    public init(storage: JournalStorage) throws {
        self.storage = storage
        journal = try storage.load()
    }
    public func reload() throws { journal = try storage.load() }
    @discardableResult
    public func checkIn(at place: Place, type: PlaceType, date: Date, note: String, now: Date = Date()) throws -> Visit {
        try validate(type: type, place: place, date: date, note: note, now: now)
        let visit = Visit(id: UUID(), place: place, type: type, visitedAt: date,
                          note: note.trimmingCharacters(in: .whitespacesAndNewlines))
        try reload()
        var next = journal
        next.visits.append(visit)
        try commit(next)
        return visit
    }
    public func update(_ visit: Visit, date: Date, note: String, now: Date = Date()) throws {
        try validate(type: visit.type, place: visit.place, date: date, note: note, now: now)
        try reload()
        guard let index = journal.visits.firstIndex(where: { $0.id == visit.id }) else { throw JournalError.unknownVisit }
        var next = journal
        next.visits[index].visitedAt = date
        next.visits[index].note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        try commit(next)
    }
    public func delete(_ visit: Visit) throws {
        try reload()
        var next = journal
        next.visits.removeAll { $0.id == visit.id }
        try commit(next)
    }
    public func toggleSaved(_ place: Place) throws {
        try reload()
        var next = journal
        let identities = Set([place.id] + place.aliases)
        if next.savedPlaces.contains(where: { identities.contains($0.id) }) {
            next.savedPlaces.removeAll { identities.contains($0.id) }
        } else { next.savedPlaces.append(place) }
        try commit(next)
    }
    /// Choose a Base Camp, or pass nil to clear it. Only one place can be Base Camp.
    public func setBaseCamp(_ place: Place?) throws {
        try reload()
        var next = journal
        next.baseCamp = place
        try commit(next)
    }
    public func export() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(journal)
    }
    private func validate(type: PlaceType, place: Place, date: Date, note: String, now: Date) throws {
        guard date <= now else { throw JournalError.futureDate }
        guard place.types.contains(type) else { throw JournalError.invalidType }
        guard note.count <= 4_000 else { throw JournalError.noteTooLong }
    }
    private func commit(_ next: Journal) throws {
        try storage.save(next, replacing: journal)
        journal = try storage.load()
    }
}
