import Foundation
@preconcurrency import MapKit
import ImageIO
import UniformTypeIdentifiers
#if os(iOS)
import UIKit
#else
import AppKit
#endif

/// The medium widget's map: a dark, label-free picture around you and the shown place, with a
/// blue dot for you and the place's marker in its type color. Nil if it takes longer than 5 s.
enum MapSnapshot {
    /// The map's share of the medium widget, in points: the right side, wide enough to fade into the text.
    static let mediumSize = CGSize(width: 220, height: 170)

    static func make(from fix: LocationFix, to place: Place, size: CGSize, scale: CGFloat,
                     timeout: TimeInterval = 5) async -> Data? {
        guard let lat = place.latitude, let lon = place.longitude else { return nil }
        let you = CLLocationCoordinate2D(latitude: fix.latitude, longitude: fix.longitude)
        let there = CLLocationCoordinate2D(latitude: lat, longitude: lon)
        let latSpan = min(120, max(0.01, abs(you.latitude - there.latitude) * 2.2))
        let lonSpan = min(300, max(0.01, abs(you.longitude - there.longitude) * 2.2))
        // Nudged west so both marks sit right of the fade.
        let center = CLLocationCoordinate2D(latitude: (you.latitude + there.latitude) / 2,
                                            longitude: (you.longitude + there.longitude) / 2 - lonSpan * 0.12)
        let options = MKMapSnapshotter.Options()
        options.region = MKCoordinateRegion(center: center, span: MKCoordinateSpan(latitudeDelta: latSpan, longitudeDelta: lonSpan))
        options.size = size
        options.pointOfInterestFilter = .excludingAll
        #if os(iOS)
        // MapKit accepts only the device's own screen scale (2× on iPad, 3× on most iPhones) and
        // rejects any other, so the scale comes from the screen rather than the caller.
        options.traitCollection = UITraitCollection { $0.userInterfaceStyle = .dark; $0.displayScale = UIScreen.main.scale }
        #else
        options.appearance = NSAppearance(named: .darkAqua)
        #endif
        let snapshotter = MKMapSnapshotter(options: options)
        let snapshot: MKMapSnapshotter.Snapshot? = await withCheckedContinuation { continuation in
            let once = Once(continuation)
            snapshotter.start { snapshot, _ in once.resume(snapshot) }
            DispatchQueue.global().asyncAfter(deadline: .now() + timeout) {
                snapshotter.cancel()
                once.resume(nil)
            }
        }
        guard let snapshot else { return nil }
        return draw(snapshot, you: you, there: there, color: place.browseTypes.first?.mapColorHex ?? "#244e3c")
    }

    /// Draws the marks with Core Graphics and encodes a JPEG, so the entry stays small.
    private static func draw(_ snapshot: MKMapSnapshotter.Snapshot, you: CLLocationCoordinate2D,
                             there: CLLocationCoordinate2D, color: String) -> Data? {
        #if os(iOS)
        guard let base = snapshot.image.cgImage else { return nil }
        let pointSize = snapshot.image.size
        #else
        guard let base = snapshot.image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
        let pointSize = snapshot.image.size
        #endif
        let width = base.width, height = base.height
        let scale = CGFloat(width) / max(1, pointSize.width)
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { return nil }
        context.draw(base, in: CGRect(x: 0, y: 0, width: width, height: height))
        // Snapshot points run top-down; the bitmap context runs bottom-up.
        func pixel(_ coordinate: CLLocationCoordinate2D) -> CGPoint {
            let point = snapshot.point(for: coordinate)
            return CGPoint(x: point.x * scale, y: CGFloat(height) - point.y * scale)
        }
        func circle(_ center: CGPoint, _ radius: CGFloat, _ fill: CGColor) {
            context.setFillColor(fill)
            context.fillEllipse(in: CGRect(x: center.x - radius * scale, y: center.y - radius * scale,
                                           width: radius * 2 * scale, height: radius * 2 * scale))
        }
        let white = CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 1)
        let place = pixel(there)
        circle(place, 9, white)
        circle(place, 7, cgColor(hex: color))
        let me = pixel(you)
        circle(me, 11, CGColor(srgbRed: 0.04, green: 0.52, blue: 1, alpha: 0.25))
        circle(me, 6.5, white)
        circle(me, 5, CGColor(srgbRed: 0.04, green: 0.52, blue: 1, alpha: 1))
        guard let image = context.makeImage() else { return nil }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.8] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { return nil }
        return data as Data
    }

    private static func cgColor(hex: String) -> CGColor {
        let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0x244e3c
        return CGColor(srgbRed: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255,
                       blue: CGFloat(value & 255) / 255, alpha: 1)
    }

    /// Resumes a continuation once, whichever of the snapshot and the timeout comes first.
    private final class Once: @unchecked Sendable {
        private let lock = NSLock()
        private var continuation: CheckedContinuation<MKMapSnapshotter.Snapshot?, Never>?
        init(_ continuation: CheckedContinuation<MKMapSnapshotter.Snapshot?, Never>) { self.continuation = continuation }
        func resume(_ value: MKMapSnapshotter.Snapshot?) {
            lock.lock(); let pending = continuation; continuation = nil; lock.unlock()
            pending?.resume(returning: value)
        }
    }
}
