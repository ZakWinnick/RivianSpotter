import Foundation
import CoreData
import CloudKit

/// Private CloudKit mirrors this local SQLite store. Each edit is an immutable
/// event, so two devices never overwrite an entire journal or each other's items.
/// Deletions remain as tombstones. Concurrent edits to one item use the newest
/// event timestamp, then revision UUID as a deterministic tie breaker.
public final class CloudJournalStorage: JournalStorage {
    public static let containerID = "iCloud.com.rivianspotter.app"
    public let url: URL
    public let container: NSPersistentCloudKitContainer

    public init(url: URL, cloudEnabled: Bool) throws {
        self.url = url
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let model = NSManagedObjectModel()
        let event = NSEntityDescription()
        event.name = "JournalEvent"
        event.managedObjectClassName = "NSManagedObject"
        func attribute(_ name: String, _ type: NSAttributeType, _ defaultValue: Any? = nil) -> NSAttributeDescription {
            let value = NSAttributeDescription()
            value.name = name
            if name == "isTombstone" { value.renamingIdentifier = "deleted" }
            value.attributeType = type; value.isOptional = true; value.defaultValue = defaultValue
            return value
        }
        event.properties = [attribute("key", .stringAttributeType), attribute("revision", .stringAttributeType),
                            attribute("modifiedAt", .dateAttributeType), attribute("payload", .binaryDataAttributeType),
                            attribute("isTombstone", .booleanAttributeType, false)]
        model.entities = [event]
        container = NSPersistentCloudKitContainer(name: "RivianSpotter", managedObjectModel: model)
        let description = NSPersistentStoreDescription(url: url)
        description.shouldAddStoreAsynchronously = false
        description.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        description.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        if cloudEnabled {
            let options = NSPersistentCloudKitContainerOptions(containerIdentifier: Self.containerID)
            options.databaseScope = .private
            description.cloudKitContainerOptions = options
        }
        container.persistentStoreDescriptions = [description]
        var loadError: Error?
        container.loadPersistentStores { _, error in loadError = error }
        if let loadError { throw loadError }
        container.viewContext.automaticallyMergesChangesFromParent = true
    }

    public private(set) var unreadableRecordCount = 0

    private func winners(in context: NSManagedObjectContext) throws -> [String: NSManagedObject] {
        let request = NSFetchRequest<NSManagedObject>(entityName: "JournalEvent")
        request.sortDescriptors = [NSSortDescriptor(key: "modifiedAt", ascending: false), NSSortDescriptor(key: "revision", ascending: false)]
        var result: [String: NSManagedObject] = [:]
        for event in try context.fetch(request) {
            // A keyless import gets a key of its own so load() reports it without matching any item.
            let key = event.value(forKey: "key") as? String ?? "unkeyed:\(event.objectID.uriRepresentation().absoluteString)"
            if result[key] == nil { result[key] = event }
        }
        return result
    }

    /// One unreadable record, such as an item synced from a newer app version, never hides the
    /// rest of the journal. It stays in the store unchanged: saves only write keys that differ
    /// between readable snapshots, so a skipped item is not overwritten or tombstoned.
    public func load() throws -> Journal {
        let context = container.newBackgroundContext()
        let (journal, skipped) = try context.performAndWait {
            var journal = Journal(), skipped = 0
            let decoder = JSONDecoder()
            for (key, event) in try winners(in: context) where !(event.value(forKey: "isTombstone") as? Bool ?? false) {
                let payload = event.value(forKey: "payload") as? Data ?? Data()
                if key.hasPrefix("visit:"), let visit = try? decoder.decode(Visit.self, from: payload),
                   key == "visit:\(visit.id.uuidString)", visit.place.types.contains(visit.type) {
                    journal.visits.append(visit)
                } else if key.hasPrefix("saved:"), let place = try? decoder.decode(Place.self, from: payload),
                          key == "saved:\(place.id)" {
                    journal.savedPlaces.append(place)
                } else { skipped += 1 }
            }
            journal.visits.sort { $0.id.uuidString < $1.id.uuidString }
            journal.savedPlaces.sort { $0.name == $1.name ? $0.id < $1.id : $0.name < $1.name }
            return (journal, skipped)
        }
        unreadableRecordCount = skipped
        return journal
    }

    private func entries(_ journal: Journal) throws -> [String: Data] {
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
        var entries: [String: Data] = [:]
        for visit in journal.visits { entries["visit:\(visit.id.uuidString)"] = try encoder.encode(visit) }
        for place in journal.savedPlaces { entries["saved:\(place.id)"] = try encoder.encode(place) }
        return entries
    }

    public func save(_ next: Journal, replacing previous: Journal) throws {
        let before = try entries(previous), after = try entries(next)
        let changed = Set(before.keys).union(after.keys).filter { before[$0] != after[$0] }
        let context = container.newBackgroundContext()
        try context.performAndWait {
            let existing = try winners(in: context)
            for key in changed {
                // Advance beyond known revisions, including a device with a skewed clock.
                let last = existing[key]?.value(forKey: "modifiedAt") as? Date ?? .distantPast
                let date = max(Date(), last.addingTimeInterval(0.001))
                insert(key: key, payload: after[key], date: date, in: context)
            }
            try compact(keys: changed, in: context)
            if context.hasChanges { try context.save() }
        }
    }

    /// Only the newest event per key can ever win, so older events for the keys just written are
    /// removed (the new event, including a tombstone, is kept). An event another device writes
    /// later is a new record and still competes normally.
    private func compact(keys: Set<String>, in context: NSManagedObjectContext) throws {
        guard !keys.isEmpty else { return }
        let request = NSFetchRequest<NSManagedObject>(entityName: "JournalEvent")
        request.predicate = NSPredicate(format: "key IN %@", Array(keys))
        for event in try context.fetch(request) where !event.isInserted {
            context.delete(event)
        }
    }

    public enum LegacyMigration: Equatable, Sendable { case noLegacyFile, migrated, unreadable }

    /// Legacy JSON stays untouched. Existing events, including deletions, always
    /// win. Re-running migration after interruption cannot duplicate visits.
    /// A damaged legacy file is reported instead of thrown so the journal still opens;
    /// it is retried on the next launch. Only store failures throw.
    @discardableResult
    public func migrate(from legacyURL: URL) throws -> LegacyMigration {
        guard FileManager.default.fileExists(atPath: legacyURL.path) else { return .noLegacyFile }
        guard let legacy = try? entries(JSONJournalStorage(url: legacyURL).load()) else { return .unreadable }
        let context = container.newBackgroundContext()
        try context.performAndWait {
            let existing = try winners(in: context)
            for (key, payload) in legacy where existing[key] == nil {
                insert(key: key, payload: payload, date: .distantPast, in: context)
            }
            if context.hasChanges { try context.save() }
        }
        return .migrated
    }

    private func insert(key: String, payload: Data?, date: Date, in context: NSManagedObjectContext) {
        let event = NSEntityDescription.insertNewObject(forEntityName: "JournalEvent", into: context)
        event.setValue(key, forKey: "key")
        event.setValue(UUID().uuidString, forKey: "revision")
        event.setValue(date, forKey: "modifiedAt")
        event.setValue(payload, forKey: "payload")
        event.setValue(payload == nil, forKey: "isTombstone")
    }
}
