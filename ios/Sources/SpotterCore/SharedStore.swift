import Foundation
import CoreData

public enum SharedStoreError: Error { case noGroupContainer }

public enum JournalMove: Equatable, Sendable { case notNeeded, moved(visits: Int), keptOld }

/// The App Group folder the app and the widget share, and the one-time move of the journal into it.
public enum SharedStore {
    public static let groupID = "group.com.rivianspotter.app"
    static let storeName = "journal.sqlite", markerName = ".journal-moved"
    static let sideFiles = ["directory-cache.json", "journal.json"]

    /// The macOS preview and the test runner have no group container; they pass a folder instead.
    public static func directory() throws -> URL {
        #if os(macOS)
        throw SharedStoreError.noGroupContainer
        #else
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else {
            throw SharedStoreError.noGroupContainer
        }
        return container.appendingPathComponent("RivianSpotter", isDirectory: true)
        #endif
    }

    /// Copies the journal into `newDirectory` and deletes the original only after the copy reads
    /// back the same journal. Any failure leaves the original untouched and returns `.keptOld`,
    /// so the move is retried on the next launch.
    public static func moveJournalIfNeeded(from oldDirectory: URL, to newDirectory: URL) throws -> JournalMove {
        let files = FileManager.default
        let oldStore = oldDirectory.appendingPathComponent(storeName), newStore = newDirectory.appendingPathComponent(storeName)
        let marker = oldDirectory.appendingPathComponent(markerName)
        guard files.fileExists(atPath: oldStore.path) else {
            moveSideFiles(from: oldDirectory, to: newDirectory)
            return .notNeeded
        }
        // The move finished but cleanup was interrupted. Copying again would replace newer visits.
        if files.fileExists(atPath: newStore.path), files.fileExists(atPath: marker.path) {
            removeStore(at: oldStore)
            moveSideFiles(from: oldDirectory, to: newDirectory)
            return .notNeeded
        }
        guard let expected = try? contents(of: oldStore) else { return .keptOld }
        // A readable destination holding a visit the old journal lacks was written in the group
        // already (for example by the widget). Replacing it would lose that visit.
        if files.fileExists(atPath: newStore.path), let existing = try? contents(of: newStore) {
            let known = Set(expected.journal.visits.map(\.id))
            if existing.journal.visits.contains(where: { !known.contains($0.id) }) { return .keptOld }
        }
        do {
            try files.createDirectory(at: newDirectory, withIntermediateDirectories: true)
            let coordinator = NSPersistentStoreCoordinator(managedObjectModel: CloudJournalStorage.makeModel())
            try coordinator.replacePersistentStore(at: newStore, destinationOptions: CloudJournalStorage.storeOptions,
                withPersistentStoreFrom: oldStore, sourceOptions: CloudJournalStorage.storeOptions, type: .sqlite)
            guard try contents(of: newStore) == expected else { throw CocoaError(.fileReadCorruptFile) }
            try Data().write(to: marker)
        } catch {
            removeStore(at: newStore)
            return .keptOld
        }
        // The marker is written and the copy verified, so leftovers are cleaned up on a later run.
        removeStore(at: oldStore)
        moveSideFiles(from: oldDirectory, to: newDirectory)
        return .moved(visits: expected.journal.visits.count)
    }

    private struct Contents: Equatable { let journal: Journal, unreadable: Int }

    /// Opens the store without CloudKit, reads it, and closes it again before any file changes.
    private static func contents(of url: URL) throws -> Contents {
        let storage = try CloudJournalStorage(url: url, cloudEnabled: false)
        defer { try? storage.close() }
        let journal = try storage.load()
        return Contents(journal: journal, unreadable: storage.unreadableRecordCount)
    }

    /// Sidecars go first, so a partial delete never leaves a write-ahead log without its database.
    private static func removeStore(at url: URL) {
        for suffix in ["-wal", "-shm", ""] {
            try? FileManager.default.removeItem(at: URL(fileURLWithPath: url.path + suffix))
        }
    }

    /// Copy, then delete. A file already in the group is newer, so the old one stays untouched.
    private static func moveSideFiles(from oldDirectory: URL, to newDirectory: URL) {
        let files = FileManager.default
        for name in sideFiles {
            let source = oldDirectory.appendingPathComponent(name), target = newDirectory.appendingPathComponent(name)
            guard files.fileExists(atPath: source.path), !files.fileExists(atPath: target.path) else { continue }
            do {
                try files.createDirectory(at: newDirectory, withIntermediateDirectories: true)
                try files.copyItem(at: source, to: target)
                try files.removeItem(at: source)
            } catch { continue }
        }
    }
}
