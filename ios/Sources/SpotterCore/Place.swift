import Foundation

public enum PlaceType: String, Codable, CaseIterable, Identifiable, Sendable {
    case ran = "RAN", waypoint = "Waypoint", space = "Space"
    case service = "Service Center", demo = "Demo Center", outpost = "Outpost"
    public var id: String { rawValue }
    public var symbol: String {
        switch self {
        case .ran: "bolt.fill"
        case .waypoint: "bolt.car"
        case .space: "building.2"
        case .service: "wrench.and.screwdriver"
        case .demo: "steeringwheel"
        case .outpost: "mountain.2"
        }
    }
}

public struct PlacePhoto: Codable, Equatable, Sendable {
    public let imageURL: String
    public let sourceURL: String
    public let credit: String
    public let description: String
    public let scope: String
    public var isCategory: Bool { scope == "category" }
    public var safeImageURL: URL? {
        guard let url = URL(string: imageURL), url.scheme == "https",
              url.user == nil, url.password == nil,
              ["media.rivian.com", "photos.plugshare.com", "cdn10.localdatacdn.com", "cdn8.localdatacdn.com"].contains(url.host ?? "") else { return nil }
        return url
    }
    public var safeSourceURL: URL? {
        guard let url = URL(string: sourceURL), url.scheme == "https",
              url.user == nil, url.password == nil,
              ["rivian.com", "www.plugshare.com", "www.loc8nearme.com"].contains(url.host ?? "") else { return nil }
        return url
    }
}

public struct PlaceInformation: Codable, Equatable, Sendable {
    public let title: String
    public let facts: [PlaceFact]
    public let expandable: Bool
    public let sourceURL: String?
    public var safeSourceURL: URL? {
        guard let sourceURL, let url = URL(string: sourceURL), url.scheme == "https",
              url.host == "rivianroamer.com", url.user == nil, url.password == nil else { return nil }
        return url
    }
}

public struct PlaceFact: Codable, Equatable, Sendable {
    public let title: String
    public let value: String
}

public struct Place: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let aliases: [String]
    public let slug: String
    public let name: String
    public let types: [PlaceType]
    public var directoryTypes: [PlaceType]? = nil
    public var browseTypes: [PlaceType] { directoryTypes ?? types }
    public let city: String
    public let region: String
    public let country: String
    public let address: String?
    public let latitude: Double?
    public let longitude: Double?
    public let coordinatePrecision: String
    public let status: String
    public let listed: Bool
    public let hours: String?
    public let serviceHours: String?
    public let sourceURL: String?
    public let checkedOn: String?
    public let chargerCount: Int?
    public let maxKw: Double?
    public let photo: PlacePhoto?
    public var information: [PlaceInformation]? = nil
    public var postalCode: String? = nil
    public var relatedPlaceIDs: [String]? = nil

    public var locality: String { [city, region, country].filter { !$0.isEmpty }.joined(separator: ", ") }
    public var typeLabel: String { types.map(\.rawValue).joined(separator: " · ") }
    public var hasPreciseCoordinates: Bool {
        guard let latitude, let longitude else { return false }
        return latitude.isFinite && longitude.isFinite && abs(latitude) <= 90 && abs(longitude) <= 180
            && ["exact", "map-pin"].contains(coordinatePrecision)
    }
    public var statusLabel: String {
        if !listed { return "No longer listed" }
        switch status {
        case "planned": return "Coming soon"
        case "open": return "Operating location"
        case "temporarily-closed": return "Temporarily closed"
        case "closed": return "Closed"
        default: return "Current availability unconfirmed"
        }
    }
    public var websiteURL: URL? { URL(string: "https://rivianspotter.com/locations/\(slug)/") }
    public var safeSourceURL: URL? {
        guard let sourceURL, let url = URL(string: sourceURL), url.scheme == "https", url.host != nil else { return nil }
        return url
    }
    public func matches(_ query: String) -> Bool {
        let fields = "\(name) \(locality) \(address ?? "") \(typeLabel)"
        return query.split(whereSeparator: \.isWhitespace).allSatisfy {
            fields.localizedStandardContains(String($0))
        }
    }
}

public struct Catalog: Codable, Sendable {
    public let schemaVersion: Int
    public let places: [Place]
    public static func bundled() throws -> Catalog {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: "catalog", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: url))
        guard catalog.schemaVersion == 1, !catalog.places.isEmpty,
              Set(catalog.places.map(\.id)).count == catalog.places.count else {
            throw CocoaError(.coderReadCorrupt)
        }
        return catalog
    }
    public func place(for id: String) -> Place? {
        places.first { $0.id == id || $0.aliases.contains(id) }
    }
}
