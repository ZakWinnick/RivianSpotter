import Foundation

public enum PlaceType: String, Codable, CaseIterable, Identifiable, Sendable {
    case ran = "RAN", waypoint = "Waypoint", space = "Space"
    case service = "Service Center", demo = "Demo Center", outpost = "Outpost"
    public var id: String { rawValue }
    public var displayName: String { self == .ran ? "Rivian Adventure Network" : rawValue }
    public var mapColorHex: String {
        switch self {
        case .ran: "#b4621a"
        case .waypoint: "#7062a4"
        case .space: "#244e3c"
        case .demo: "#30536c"
        case .service: "#715a43"
        case .outpost: "#59612e"
        }
    }
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
              ["media.rivian.com", "photos.plugshare.com", "cdn10.localdatacdn.com", "cdn8.localdatacdn.com",
               "rivianspotter.com"].contains(url.host ?? "") else { return nil }
        return url
    }
    public var safeSourceURL: URL? {
        guard let url = URL(string: sourceURL), url.scheme == "https",
              url.user == nil, url.password == nil,
              ["rivian.com", "www.plugshare.com", "www.loc8nearme.com"].contains(url.host ?? "") else { return nil }
        return url
    }
}

public struct PlaceReliability: Codable, Equatable, Sendable {
    public let grade: String
    public let background: String
    public let foreground: String
}

public struct PlaceInformation: Codable, Equatable, Sendable {
    public let title: String
    public let facts: [PlaceFact]
    public let expandable: Bool
    public let sourceURL: String?
    public var reliability: PlaceReliability? = nil
    public var metrics: [PlaceFact]? = nil
    public var tags: [String]? = nil
    public var safeSourceURL: URL? {
        guard let sourceURL, let url = URL(string: sourceURL), url.scheme == "https",
              ["rivianroamer.com", "x.com", "twitter.com"].contains(url.host ?? ""), url.user == nil, url.password == nil else { return nil }
        return url
    }
}

/// A coming-soon site's permit filing, as reported publicly (for example by RAN Tracker).
public struct PlacePermit: Codable, Equatable, Sendable {
    public let stage: String
    public let stageLabel: String
    public let address: String
    public let reportedOn: String
    public let sourceURL: String
    public let sourceName: String
    public var safeSourceURL: URL? {
        guard let url = URL(string: sourceURL), url.scheme == "https", ["x.com", "twitter.com"].contains(url.host ?? ""),
              url.user == nil, url.password == nil else { return nil }
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
    public var reliability: PlaceReliability? = nil
    public var bookingURL: String? = nil
    public var phone: String? = nil
    public var permit: PlacePermit? = nil
    /// "rivian-coming-soon" or "permit-filing" for planned sites.
    public var planningSource: String? = nil

    public var safeBookingURL: URL? {
        guard let bookingURL, let url = URL(string: bookingURL), url.scheme == "https",
              let host = url.host, host == "rivian.com" || host.hasSuffix(".rivian.com"),
              url.user == nil, url.password == nil else { return nil }
        return url
    }
    public var phoneURL: URL? {
        guard let phone else { return nil }
        let number = phone.filter { $0.isNumber || $0 == "+" }
        return number.isEmpty ? nil : URL(string: "tel:\(number)")
    }

    public var locality: String { [city, region, country].filter { !$0.isEmpty }.joined(separator: ", ") }
    public var typeLabel: String { types.map(\.displayName).joined(separator: " + ") }
    public var hasPreciseCoordinates: Bool {
        guard let latitude, let longitude else { return false }
        return latitude.isFinite && longitude.isFinite && abs(latitude) <= 90 && abs(longitude) <= 180
            && ["exact", "map-pin"].contains(coordinatePrecision)
    }
    public var hasMapCoordinates: Bool {
        guard let latitude, let longitude, latitude.isFinite, longitude.isFinite,
              abs(latitude) <= 90, abs(longitude) <= 180 else { return false }
        return hasPreciseCoordinates || (status == "planned" && ["city", "permit-address"].contains(coordinatePrecision))
    }
    public var statusLabel: String {
        if !listed { return "No longer listed" }
        switch status {
        case "planned": return permit.map { "Coming soon · \($0.stageLabel)" } ?? "Coming soon"
        case "open": return "Operating location"
        case "temporarily-closed": return "Temporarily closed"
        case "closed": return "Closed"
        default: return "Listed by Rivian"
        }
    }
    public var websiteURL: URL? { URL(string: "https://rivianspotter.com/locations/\(slug)/") }
    public var safeSourceURL: URL? {
        guard let sourceURL, let url = URL(string: sourceURL), url.scheme == "https", url.host != nil else { return nil }
        return url
    }
    public func matches(_ query: String) -> Bool {
        let fields = "\(name) \(locality) \(address ?? "") \(permit?.address ?? "") \(typeLabel) \(types.map(\.rawValue).joined(separator: " "))"
        return query.split(whereSeparator: \.isWhitespace).allSatisfy {
            fields.localizedStandardContains(String($0))
        }
    }
}

/// Published status, grouped for browsing. Every current Rivian listing is "Listed"; only
/// coming-soon, closed, and removed listings get a group of their own.
public enum PlaceStatusGroup: String, CaseIterable, Identifiable, Sendable {
    case listed = "Listed", comingSoon = "Coming Soon"
    case temporarilyClosed = "Temporarily Closed", closed = "Closed", unlisted = "No Longer Listed"
    public var id: String { rawValue }
    public init(_ place: Place) {
        if !place.listed { self = .unlisted; return }
        switch place.status {
        case "planned": self = .comingSoon
        case "temporarily-closed": self = .temporarilyClosed
        case "closed": self = .closed
        default: self = .listed
        }
    }
}

public extension Place {
    var statusGroup: PlaceStatusGroup { PlaceStatusGroup(self) }
    /// Site features the directory publishes for this place (amenities, access, services), in
    /// published order without repeats. Nothing is inferred from the location type.
    var siteFeatures: [String] {
        var seen = Set<String>(), result: [String] = []
        for tag in (information ?? []).flatMap({ $0.tags ?? [] }) where seen.insert(tag).inserted { result.append(tag) }
        return result
    }
}

public struct PlaceFilter: Sendable {
    public enum Status: String, CaseIterable, Sendable {
        case all = "All statuses", listed = "Listed", planned = "Coming Soon", unlisted = "No Longer Listed"
    }
    public var type: PlaceType? = nil
    public var status: Status = .all
    public var region = ""
    public var savedOnly = false
    public init() {}
    public var activeCount: Int { (type == nil ? 0 : 1) + (status == .all ? 0 : 1) + (region.isEmpty ? 0 : 1) + (savedOnly ? 1 : 0) }
    public func matches(_ place: Place, saved: Bool) -> Bool {
        guard type == nil || place.browseTypes.contains(type!), region.isEmpty || region == place.region,
              !savedOnly || saved else { return false }
        switch status {
        case .all: return true
        case .listed: return place.statusGroup == .listed
        case .planned: return place.listed && place.status == "planned"
        case .unlisted: return !place.listed
        }
    }
}

public enum PlaceClustering {
    /// Greedy map clustering. Each cluster is anchored at its first place, and a place joins a
    /// cluster only when it lies within one cell (span ÷ divisions) of that anchor on both axes.
    /// Anchors therefore stay at least a cell apart, so markers drawn at anchors don't overlap.
    public static func clusters(_ places: [Place], latitudeSpan: Double, longitudeSpan: Double,
                                divisions: Double = 8) -> [[Place]] {
        let latCell = max(latitudeSpan / divisions, 0.00001), lonCell = max(longitudeSpan / divisions, 0.00001)
        let mapped = places.filter(\.hasMapCoordinates).sorted {
            $0.latitude! == $1.latitude! ? $0.longitude! < $1.longitude! : $0.latitude! > $1.latitude!
        }
        var result: [[Place]] = []
        for place in mapped {
            if let index = result.firstIndex(where: {
                abs($0[0].latitude! - place.latitude!) < latCell && abs($0[0].longitude! - place.longitude!) < lonCell
            }) {
                result[index].append(place)
            } else { result.append([place]) }
        }
        return result
    }

    /// Places within roughly 50 m of each other can't be separated by zooming.
    public static func isColocated(_ places: [Place]) -> Bool {
        let lats = places.compactMap(\.latitude), lons = places.compactMap(\.longitude)
        guard let minLat = lats.min(), let maxLat = lats.max(), let minLon = lons.min(), let maxLon = lons.max() else { return false }
        return maxLat - minLat < 0.0005 && maxLon - minLon < 0.0005
    }
}

/// Decodes one array element without failing the whole array.
private struct Lenient<Value: Decodable>: Decodable {
    let value: Value?
    init(from decoder: Decoder) throws { value = try? Value(from: decoder) }
}

public struct Catalog: Codable, Sendable {
    public let schemaVersion: Int
    public let revision: Int64?
    public let places: [Place]
    public init(schemaVersion: Int, places: [Place], revision: Int64? = nil) {
        self.schemaVersion = schemaVersion; self.places = places; self.revision = revision
    }
    public static func bundled() throws -> Catalog {
        #if SWIFT_PACKAGE
        let bundle = Bundle.module
        #else
        let bundle = Bundle.main
        #endif
        guard let url = bundle.url(forResource: "catalog", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try validated(Data(contentsOf: url))
    }
    /// Reads a directory leniently so installed apps keep receiving updates as the website grows:
    /// location types this build doesn't know are dropped from a record, an out-of-range pin
    /// becomes "no pin", and an unreadable or ambiguous record is skipped. A response where
    /// most records are unusable is still rejected as a broken export.
    public static func validated(_ data: Data) throws -> Catalog {
        struct Header: Decodable { let schemaVersion: Int; let revision: Int64 }
        guard data.count <= 20 * 1024 * 1024,
              let header = try? JSONDecoder().decode(Header.self, from: data),
              header.schemaVersion == 1, header.revision > 0, header.revision <= 9_007_199_254_740_991,
              let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let records = root["places"] as? [[String: Any]], !records.isEmpty else {
            throw CocoaError(.coderReadCorrupt)
        }
        let known = Set(PlaceType.allCases.map(\.rawValue))
        func outOfRange(_ value: Any?, _ limit: Double) -> Bool {
            guard let value, !(value is NSNull) else { return false }
            guard let number = value as? Double else { return true }
            return !number.isFinite || abs(number) > limit
        }
        let repaired = records.map { original -> [String: Any] in
            var record = original
            for key in ["types", "directoryTypes"] {
                if let values = record[key] as? [String] { record[key] = values.filter(known.contains) }
            }
            if outOfRange(record["latitude"], 90) || outOfRange(record["longitude"], 180) {
                record["latitude"] = NSNull(); record["longitude"] = NSNull(); record["coordinatePrecision"] = "unknown"
            }
            return record
        }
        let decoded = try JSONDecoder().decode([Lenient<Place>].self, from: JSONSerialization.data(withJSONObject: repaired))
        var identities = Set<String>(), places: [Place] = []
        for case let place? in decoded.map(\.value) where !place.id.isEmpty && !place.name.isEmpty && !place.types.isEmpty {
            // An identity claimed twice is ambiguous; the first record keeps it.
            let claimed = [place.id] + place.aliases.filter { !$0.isEmpty }
            guard identities.isDisjoint(with: claimed) else { continue }
            identities.formUnion(claimed)
            places.append(place)
        }
        guard places.count * 2 > records.count else { throw CocoaError(.coderReadCorrupt) }
        return Catalog(schemaVersion: 1, places: places, revision: header.revision)
    }

    /// Light checks for a directory this app already validated and cached itself.
    var isWellFormed: Bool {
        schemaVersion == 1 && (revision ?? 0) > 0 && (revision ?? 0) <= 9_007_199_254_740_991 &&
        !places.isEmpty && Set(places.map(\.id)).count == places.count
    }
    public func place(for id: String) -> Place? {
        places.first { $0.id == id || $0.aliases.contains(id) }
    }
    public func resolving(_ saved: Place) -> Place {
        place(for: saved.id) ?? saved.aliases.compactMap { place(for: $0) }.first ?? saved
    }
}
