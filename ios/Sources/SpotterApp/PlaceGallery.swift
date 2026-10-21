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
    private func release() {
        if waiters.isEmpty { active -= 1 } else { waiters.removeFirst().resume() }
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

struct PlaceDetailPhoto: View {
    let place: Place
    @State private var artwork: PlaceArtwork?
    @State private var finished = false
    var body: some View {
        if let photo = place.photo, photo.safeImageURL != nil {
            VStack(alignment: .leading, spacing: 8) {
                if let artwork {
                    GeometryReader { geometry in
                        #if os(macOS)
                        Image(nsImage: artwork.image).resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                        #else
                        Image(uiImage: artwork.image).resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                        #endif
                    }.aspectRatio(16/9, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 14))
                        .accessibilityLabel(photo.isCategory ? "Representative \(place.typeLabel) image" : photo.description)
                    if photo.isCategory {
                        Text("Representative charger photo · not this location")
                            .font(.system(size: 12)).foregroundStyle(.secondary)
                    }
                    if let url = photo.safeSourceURL {
                        Link("\(photo.credit) ↗", destination: url).font(.system(size: 12))
                    }
                } else if !finished {
                    ProgressView().frame(maxWidth: .infinity).frame(height: 80).accessibilityLabel("Loading location photo")
                }
            }
            .task(id: photo.imageURL) {
                finished = false
                artwork = nil
                artwork = await PlaceArtworkCache.shared.artwork(for: place)
                finished = true
            }
        }
    }
}

struct PlaceBrowseCard: View {
    let place: Place
    let title: String
    var distance: String? = nil
    let visited: Bool
    let open: () -> Void
    @State private var artwork: PlaceArtwork?
    @ScaledMetric(relativeTo: .body) private var cardHeight = 148.0
    @ScaledMetric(relativeTo: .body) private var titleSize = 14.0
    var body: some View {
        Button(action: open) {
            GeometryReader { geometry in
                ZStack(alignment: .bottomLeading) {
                    Color(red: 0.16, green: 0.20, blue: 0.18)
                    if let artwork {
                        #if os(macOS)
                        Image(nsImage: artwork.image).resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: cardHeight).clipped()
                        #else
                        Image(uiImage: artwork.image).resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: cardHeight).clipped()
                        #endif
                    } else {
                        Image(systemName: place.types.first?.symbol ?? "mappin")
                            .font(.system(size: 34, weight: .light)).foregroundStyle(.white.opacity(0.22))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    LinearGradient(colors: [.clear, .black.opacity(0.85)], startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            if place.photo?.isCategory == true { Text("Category image").font(.system(size: 10)) }
                            Spacer()
                            if visited { Image(systemName: "checkmark.circle.fill").foregroundStyle(.yellow) }
                        }
                        Spacer(minLength: 8)
                        Text(title).font(.system(size: titleSize, weight: .bold)).lineLimit(2)
                        Text(distance.map { "\(place.region) · \($0)" } ?? "\(place.typeLabel) · \(place.region)")
                            .font(.system(size: 12, weight: .medium)).lineLimit(1)
                        if place.status == "planned" || !place.listed {
                            Text(place.statusLabel).font(.system(size: 11, weight: .medium))
                        }
                    }.foregroundStyle(.white).padding(10)
                }.frame(width: geometry.size.width, height: cardHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .contentShape(RoundedRectangle(cornerRadius: 10))
            }.frame(height: cardHeight)
        }.buttonStyle(.plain)
            .accessibilityLabel("\(place.name)\(visited ? ", visited" : "")")
            .task(id: place.photo?.imageURL) {
                artwork = nil
                artwork = await PlaceArtworkCache.shared.artwork(for: place)
            }
    }
}
