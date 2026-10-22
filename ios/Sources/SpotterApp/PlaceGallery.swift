import SwiftUI
import ImageIO
#if SWIFT_PACKAGE
import SpotterCore
#endif
#if os(macOS)
private typealias PlaceImage = NSImage
#else
private typealias PlaceImage = UIImage
#endif

private final class PlaceArtwork: NSObject {
    let image: PlaceImage
    let kind: String
    init(image: PlaceImage, kind: String) { self.image = image; self.kind = kind }
}

/// Visible gallery cards and opened places request imagery. Limit concurrency and retain a
/// bounded in-memory cache; imagery and device location are not journal data.
@MainActor
private final class PlaceArtworkCache {
    static let shared = PlaceArtworkCache()
    private let cache = NSCache<NSString, PlaceArtwork>()
    private var active = 0
    private var waiters: [CheckedContinuation<Void, Never>] = []
    init() { cache.countLimit = 60; cache.totalCostLimit = 40 * 1024 * 1024 }
    private func acquire() async {
        if active < 3 { active += 1; return }
        await withCheckedContinuation { waiters.append($0) }
    }
    // Newest request first: after a fast scroll, the cards now on screen were requested last,
    // so they load before cards that have already scrolled away.
    private func release() {
        if waiters.isEmpty { active -= 1 } else { waiters.removeLast().resume() }
    }
    private var pending: [URL: Task<PlaceArtwork?, Never>] = [:]
    private var failures: [URL: Date] = [:]
    func artwork(for place: Place) async -> PlaceArtwork? {
        guard let url = place.photo?.safeImageURL else { return nil }
        let key = url.absoluteString as NSString
        if let cached = cache.object(forKey: key) { return cached }
        if let task = pending[url] { return await task.value }
        if let failed = failures[url], Date().timeIntervalSince(failed) < 30 { return nil }
        let task = Task { @MainActor in
            await self.acquire()
            defer { self.release() }
            do {
                let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 20)
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                      data.count <= 12 * 1024 * 1024,
                      let source = CGImageSourceCreateWithData(data as CFData, nil),
                      let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                        kCGImageSourceCreateThumbnailFromImageAlways: true,
                        kCGImageSourceCreateThumbnailWithTransform: true,
                        kCGImageSourceThumbnailMaxPixelSize: 800
                      ] as CFDictionary) else { return nil as PlaceArtwork? }
                #if os(macOS)
                let image = NSImage(cgImage: cgImage, size: .zero)
                #else
                let image = UIImage(cgImage: cgImage)
                #endif
                let artwork = PlaceArtwork(image: image, kind: place.photo?.isCategory == true ? "Category image" : "")
                self.cache.setObject(artwork, forKey: key, cost: cgImage.width * cgImage.height * 4)
                return artwork
            } catch { return nil }
        }
        pending[url] = task
        let result = await task.value
        pending[url] = nil
        if result == nil { failures[url] = Date() }
        return result
    }
}

extension PlaceArtwork {
    var swiftUIImage: Image {
        #if os(macOS)
        Image(nsImage: image)
        #else
        Image(uiImage: image)
        #endif
    }
}

/// Loads a place's photo for views that render offline, such as a shared visit receipt.
@MainActor func loadPlaceImage(_ place: Place) async -> Image? {
    if let image = place.categoryImage { return image }
    return await PlaceArtworkCache.shared.artwork(for: place)?.swiftUIImage
}

extension Place {
    /// The bundled RAN or Waypoint charger image, used only when the directory has no photo of
    /// this site itself (no PlugShare, Loc8NearMe, or Rivian location photo).
    var categoryAsset: String? {
        guard photo?.isCategory ?? true else { return nil }
        if browseTypes.contains(.ran) { return "CategoryRAN" }
        if browseTypes.contains(.waypoint) { return "CategoryWaypoint" }
        return nil
    }
    var categoryImage: Image? {
        guard let name = categoryAsset else { return nil }
        #if os(macOS)
        return NSImage(named: name).map { Image(nsImage: $0) }
        #else
        return UIImage(named: name).map { Image(uiImage: $0) }
        #endif
    }
    /// True when the picture shown is a representative image rather than this location.
    var showsCategoryPhoto: Bool { categoryImage != nil || photo?.isCategory == true }
}

/// Fills its frame with the place's photo. Without one, the location type's color and symbol
/// stand in, so a missing photo never borrows another site's image.
struct PlaceImageView: View {
    let place: Place
    @State private var artwork: PlaceArtwork?
    private var type: PlaceType { place.browseTypes.first ?? place.types.first ?? .space }
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                LinearGradient(colors: [Color(hex: type.mapColorHex), Color(hex: type.mapColorHex).opacity(0.7)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
                if let bundled = place.categoryImage {
                    // A centered crop keeps the landscape band and the charger crossing it.
                    Color.white
                    bundled.resizable().scaledToFill()
                        .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                } else if let artwork {
                    artwork.swiftUIImage.resizable().scaledToFill()
                        .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                } else {
                    Image(systemName: type.symbol).font(.system(size: min(geometry.size.height * 0.28, 44), weight: .light))
                        .foregroundStyle(.white.opacity(0.45))
                }
            }.frame(width: geometry.size.width, height: geometry.size.height)
        }.accessibilityHidden(true)
            .task(id: place.photo?.imageURL) {
                artwork = nil
                guard place.categoryImage == nil else { return }
                artwork = await PlaceArtworkCache.shared.artwork(for: place)
            }
    }
}

/// The large photo at the top of a place page, with its credit and any category-image label.
struct PlaceDetailPhoto: View {
    let place: Place
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            PlaceImageView(place: place).aspectRatio(16 / 9, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .accessibilityElement().accessibilityLabel(place.showsCategoryPhoto ? "Rivian \(place.typeLabel) charger"
                                                           : place.photo?.description ?? "No photo")
            if place.categoryImage == nil, let photo = place.photo {
                HStack(spacing: 4) {
                    if let url = photo.safeSourceURL { Link("\(photo.credit) ↗", destination: url) } else { Text(photo.credit) }
                }.font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

/// Facades-style gallery card: a full-bleed photo with the type, name, and a detail line in white
/// over a bottom gradient. Visited places carry an orange seal.
struct PlaceCard: View {
    let place: Place
    var subtitle: String? = nil
    var aspect: CGFloat = 1.6
    @EnvironmentObject private var store: SpotterStore
    private var visited: Bool { !store.visits(to: place).isEmpty }
    var body: some View {
        PlaceImageView(place: place).aspectRatio(aspect, contentMode: .fit)
            .overlay {
                LinearGradient(stops: [.init(color: .clear, location: 0.35), .init(color: .black.opacity(0.82), location: 1)],
                               startPoint: .top, endPoint: .bottom)
            }
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(place.cardCaption).font(.caption2.weight(.semibold)).opacity(0.85)
                    Text(place.guideName).font(.subheadline.weight(.bold)).lineLimit(2)
                    Text(subtitle ?? place.cardSubtitle).font(.caption.weight(.semibold)).lineLimit(1)
                }.foregroundStyle(.white).padding(10).padding(.trailing, visited ? 24 : 0)
            }
            .overlay(alignment: .bottomTrailing) {
                if visited { VisitedSeal().padding(10) }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .contentShape(RoundedRectangle(cornerRadius: 10))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel([place.name, place.typeLabel, subtitle ?? place.cardSubtitle,
                                 place.statusGroup == .comingSoon ? "Coming soon" : nil, visited ? "Visited" : nil]
                .compactMap { $0 }.joined(separator: ", "))
    }
}

struct VisitedSeal: View {
    var body: some View {
        Image(systemName: "checkmark.seal.fill").font(.system(size: 17)).symbolRenderingMode(.palette)
            .foregroundStyle(.white, Color.visited).accessibilityHidden(true)
    }
}

/// The list layout: thumbnail, name, place line, type, and a chevron.
struct PlaceListRow: View {
    let place: Place
    var subtitle: String? = nil
    @EnvironmentObject private var store: SpotterStore
    @ScaledMetric(relativeTo: .body) private var thumbWidth = 92.0
    var body: some View {
        HStack(spacing: 12) {
            PlaceImageView(place: place).frame(width: thumbWidth, height: thumbWidth * 0.6)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            VStack(alignment: .leading, spacing: 2) {
                Text(place.guideName).font(.subheadline.weight(.bold)).lineLimit(2)
                Text(subtitle ?? place.cardSubtitle).font(.caption).foregroundStyle(.secondary)
                Text(place.cardCaption).font(.caption2).foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            if !store.visits(to: place).isEmpty { VisitedSeal() }
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
        }.padding(.vertical, 6).contentShape(Rectangle())
            .accessibilityElement(children: .combine)
    }
}
