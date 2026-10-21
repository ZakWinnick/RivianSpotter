import Foundation

/// One atomic file keeps a validated directory and its HTTP validators together.
/// This cache never reads or writes the private journal.
public struct CatalogSnapshot: Codable, Sendable {
    public let catalog: Catalog
    public let etag: String?
    public let lastModified: String?
    public let checkedAt: Date

    /// The cache only ever holds a directory this app validated before writing it, so reading it
    /// back needs one decode plus light checks rather than a second full validation pass.
    public static func cached(at url: URL) -> CatalogSnapshot? {
        guard let data = try? Data(contentsOf: url), data.count <= 24 * 1024 * 1024,
              let snapshot = try? JSONDecoder().decode(Self.self, from: data),
              snapshot.catalog.isWellFormed else { return nil }
        return snapshot
    }

    /// The cached download, unless the directory bundled with this app build is newer. An older
    /// download is deleted along with its validators, so the next check downloads in full.
    public static func cached(at url: URL, unlessOlderThan bundled: Catalog?) -> CatalogSnapshot? {
        guard let snapshot = cached(at: url) else { return nil }
        if let bundled, snapshot.catalog.updatedOn < bundled.updatedOn {
            try? FileManager.default.removeItem(at: url)
            return nil
        }
        return snapshot
    }
}

public actor CatalogUpdates {
    public static let endpoint = URL(string: "https://rivianspotter.com/api/v1/catalog.json")!
    public typealias Fetch = @Sendable (URLRequest) async throws -> (Data, HTTPURLResponse)
    private let cacheURL: URL
    private let fetch: Fetch
    private var snapshot: CatalogSnapshot?

    public init(cacheURL: URL, fetch: @escaping Fetch = { try await CatalogUpdates.download($0) }) {
        self.init(cacheURL: cacheURL, snapshot: CatalogSnapshot.cached(at: cacheURL), fetch: fetch)
    }

    /// Starts from a snapshot the caller already read (or deliberately discarded, passing nil),
    /// so launch reads the cache file once.
    public init(cacheURL: URL, snapshot: CatalogSnapshot?, fetch: @escaping Fetch = { try await CatalogUpdates.download($0) }) {
        self.cacheURL = cacheURL
        self.fetch = fetch
        self.snapshot = snapshot
    }

    public func refresh() async throws -> CatalogSnapshot {
        var request = URLRequest(url: Self.endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 25)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let etag = snapshot?.etag { request.setValue(etag, forHTTPHeaderField: "If-None-Match") }
        if let modified = snapshot?.lastModified { request.setValue(modified, forHTTPHeaderField: "If-Modified-Since") }
        let (data, response) = try await fetch(request)
        let next: CatalogSnapshot
        switch response.statusCode {
        case 304:
            guard let previous = snapshot else { throw URLError(.badServerResponse) }
            next = CatalogSnapshot(catalog: previous.catalog, etag: previous.etag,
                                   lastModified: previous.lastModified, checkedAt: Date())
        case 200:
            guard response.mimeType == "application/json" else { throw URLError(.cannotParseResponse) }
            next = CatalogSnapshot(catalog: try Catalog.validated(data),
                                   etag: response.value(forHTTPHeaderField: "ETag"),
                                   lastModified: response.value(forHTTPHeaderField: "Last-Modified"), checkedAt: Date())
        default: throw URLError(.badServerResponse)
        }
        try Task.checkCancellation()
        try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: cacheURL, options: .atomic)
        snapshot = next
        return next
    }

    public static func download(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        // Download to disk so an unexpectedly large response cannot exhaust memory.
        let (url, response) = try await URLSession.shared.download(for: request)
        defer { try? FileManager.default.removeItem(at: url) }
        guard let response = response as? HTTPURLResponse,
              response.url?.scheme == "https", response.url?.host == endpoint.host else {
            throw URLError(.badServerResponse)
        }
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size <= 20 * 1024 * 1024 else { throw URLError(.dataLengthExceedsMaximum) }
        return (try Data(contentsOf: url), response)
    }
}
