import SwiftUI
import ImageIO

extension Color {
    /// The app's hex color helper (`PlacePresentation.swift`), copied so the widget doesn't build the app's views.
    init(hex: String) {
        let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xa3a3a3
        self.init(.sRGB, red: Double((value >> 16) & 255) / 255,
                  green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255, opacity: 1)
    }
}

/// The widget's own colors. The surface stays dark in light and dark mode, like Swarm's.
enum WidgetPalette {
    static let surface = Color(hex: "#1b2620")
    static let mint = Color(hex: "#d8e7db")
    static let forest = Color(hex: "#244e3c")
    static let onMint = Color(hex: "#17231b")
    static let secondary = Color.white.opacity(0.62)
}

enum WidgetLayout { case small, medium, lock }

/// Where a tap on the widget body goes.
enum WidgetLink {
    static func url(for suggestion: CheckInSuggestion) -> URL? {
        switch suggestion {
        case .nearby(_, _, true): URL(string: "rivianspotter://nearby")
        case .nearby(let place, _, false), .closest(let place, _):
            URL(string: "rivianspotter://place/")?.appendingPathComponent(place.id)
        case .needsPreciseLocation, .noUsableLocation: URL(string: "rivianspotter://location")
        case .noPlaces: URL(string: "rivianspotter://nearby")
        }
    }
}

/// Text for each state, shared by every size.
struct CheckInCopy {
    let entry: CheckInEntry

    static func typeName(_ place: Place) -> String {
        guard let type = place.browseTypes.first else { return "" }
        return type == .ran ? "RAN" : type.rawValue
    }
    static func dotColor(_ place: Place) -> Color { Color(hex: place.browseTypes.first?.mapColorHex ?? "#244e3c") }
    /// "0.1 mi" at a site; "12 mi" or "3.4 mi" for the closest place.
    static func miles(_ meters: Double, nearby: Bool) -> String {
        let miles = meters / 1609.344
        if nearby { return String(format: "%.1f mi", max(0.1, miles)) }
        return miles < 10 ? String(format: "%.1f mi", miles) : "\(Int(miles.rounded()).formatted()) mi"
    }

    var visitLine: String {
        if entry.failed { return "Couldn't check in. Open RivianSpotter." }
        // A journal that couldn't be read back has no count to show.
        if entry.justCheckedIn { return entry.visitCount > 0 ? "Visit #\(entry.visitCount) · Add a note in the app" : "Add a note in the app" }
        guard let last = entry.lastVisit else { return "First visit" }
        let age = entry.date.timeIntervalSince(last)
        if age < 30 * 60 { return "Last visit just now" }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return "Last visit \(formatter.localizedString(for: last, relativeTo: entry.date))"
    }
}

struct CheckInWidgetView: View {
    let entry: CheckInEntry
    let layout: WidgetLayout

    var body: some View {
        switch layout {
        case .lock: LockScreenCheckIn(entry: entry)
        case .medium:
            if let map = entry.map.flatMap(Self.image) { MediumCheckIn(entry: entry, map: map) }
            else { SmallCheckIn(entry: entry, refreshInline: true) }
        case .small: SmallCheckIn(entry: entry, refreshInline: true)
        }
    }

    static func image(_ data: Data) -> CGImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(source, 0, nil)
    }
}

/// The route mark from the app icon, top right.
struct WidgetBrandMark: View {
    var size: CGFloat = 24
    #if WIDGET_HARNESS
    static var override: CGImage?
    #endif
    var body: some View {
        image.resizable().scaledToFit().frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
            .accessibilityHidden(true)
    }
    private var image: Image {
        #if WIDGET_HARNESS
        if let override = Self.override { return Image(decorative: override, scale: 3) }
        #endif
        return Image("BrandMark")
    }
}

/// The text column: the small widget, and the left half of the medium one.
struct CheckInText: View {
    let entry: CheckInEntry
    var showsMark = true
    private var copy: CheckInCopy { .init(entry: entry) }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .top, spacing: 6) {
                topLine.font(.system(size: 13, weight: .medium)).foregroundStyle(WidgetPalette.secondary)
                    .lineLimit(1).minimumScaleFactor(0.75)
                Spacer(minLength: 0)
                if showsMark { WidgetBrandMark() }
            }.padding(.bottom, 3)
            switch entry.suggestion {
            case .nearby(let place, _, _):
                title(place.guideName, size: 20)
                Text(copy.visitLine).font(.system(size: 13)).foregroundStyle(WidgetPalette.secondary).lineLimit(2)
            case .closest(let place, let meters):
                title(place.guideName, size: 20)
                HStack(spacing: 5) {
                    Circle().fill(CheckInCopy.dotColor(place)).frame(width: 7, height: 7)
                    Text("\(CheckInCopy.typeName(place)) · \(CheckInCopy.miles(meters, nearby: false)) away")
                }.font(.system(size: 13)).foregroundStyle(WidgetPalette.secondary).lineLimit(1).minimumScaleFactor(0.75)
            case .noUsableLocation:
                title(entry.locationAllowed ? "Tap ↻ to try again" : "Allow location to find sites near you", size: 17)
            case .needsPreciseLocation: title("Turn on Precise Location to check in", size: 17)
            case .noPlaces: EmptyView()
            }
        }
    }

    @ViewBuilder private var topLine: some View {
        switch entry.suggestion {
        case .nearby(let place, let meters, _):
            HStack(spacing: 5) {
                Circle().fill(CheckInCopy.dotColor(place)).frame(width: 7, height: 7)
                Text("\(CheckInCopy.typeName(place)) · \(CheckInCopy.miles(meters, nearby: true))")
            }
        case .closest: Text("No nearby site")
        case .noUsableLocation: Text(entry.locationAllowed ? "Location unavailable" : "Location off")
        case .needsPreciseLocation: Text("Precise Location off")
        case .noPlaces: Text("RivianSpotter")
        }
    }

    private func title(_ text: String, size: CGFloat) -> some View {
        Text(text).font(.system(size: size, weight: .bold)).foregroundStyle(.white)
            .lineLimit(2).minimumScaleFactor(0.75).fixedSize(horizontal: false, vertical: true)
    }
}

/// Check In, its confirmation, the "Closest site" label, or Open RivianSpotter.
struct CheckInAction: View {
    let entry: CheckInEntry

    var body: some View {
        switch entry.suggestion {
        case .nearby(let place, _, _):
            if entry.justCheckedIn {
                pill("✓ Checked In", fill: WidgetPalette.forest, ink: WidgetPalette.mint)
            } else {
                Button(intent: CheckInIntent(placeID: place.id)) {
                    pill("Check In", fill: WidgetPalette.mint, ink: WidgetPalette.onMint)
                }.buttonStyle(.plain)
            }
        case .closest: pill("Closest site", fill: .white.opacity(0.08), ink: .white.opacity(0.4))
        // Permission is on but the fix was weak or stale: only the refresh button, beside this.
        case .noUsableLocation where entry.locationAllowed: Spacer(minLength: 0)
        // A tap anywhere opens the app (`widgetURL`), so this is a label rather than a link.
        case .noUsableLocation, .needsPreciseLocation, .noPlaces:
            pill("Open RivianSpotter", fill: WidgetPalette.mint, ink: WidgetPalette.onMint)
        }
    }

    private func pill(_ text: String, fill: Color, ink: Color) -> some View {
        Text(text).font(.system(size: 15, weight: .bold)).foregroundStyle(ink)
            .lineLimit(1).minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: 38).padding(.horizontal, 8)
            .background(fill, in: Capsule())
    }
}

struct RefreshButton: View {
    var body: some View {
        Button(intent: RefreshIntent()) {
            Image(systemName: "arrow.clockwise").font(.system(size: 15, weight: .bold))
                .foregroundStyle(WidgetPalette.onMint)
                .frame(width: 38, height: 38).background(.white, in: Circle())
        }.buttonStyle(.plain).accessibilityLabel("Refresh")
    }
}

/// The small widget, also the medium one without a map.
struct SmallCheckIn: View {
    let entry: CheckInEntry
    var refreshInline: Bool

    private var showsRefresh: Bool {
        switch entry.suggestion {
        case .nearby, .closest: true
        case .noUsableLocation: entry.locationAllowed
        default: false
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CheckInText(entry: entry)
            Spacer(minLength: 6)
            HStack(spacing: 8) {
                CheckInAction(entry: entry)
                if showsRefresh && refreshInline { RefreshButton() }
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

/// The medium widget: text and buttons on the left, the map on the right fading into them, and
/// refresh at the bottom right over the map.
struct MediumCheckIn: View {
    let entry: CheckInEntry
    let map: CGImage

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                Image(decorative: map, scale: 3).resizable().scaledToFill()
                    .frame(width: geometry.size.width * 0.62, height: geometry.size.height).clipped()
                    .mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.4)],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
                VStack(alignment: .leading, spacing: 0) {
                    CheckInText(entry: entry, showsMark: false)
                    Spacer(minLength: 6)
                    CheckInAction(entry: entry)
                }
                .padding(15)
                .frame(width: geometry.size.width * 0.54, height: geometry.size.height, alignment: .topLeading)
                WidgetBrandMark().padding(12).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                RefreshButton().padding(15).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            }
        }
    }
}

/// The Lock Screen widget: system rendering, no colors of its own.
struct LockScreenCheckIn: View {
    let entry: CheckInEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(heading).font(.headline).lineLimit(1).widgetAccentable()
            detail
        }.frame(maxWidth: .infinity, alignment: .leading)
    }

    private var heading: String {
        switch entry.suggestion {
        case .nearby(let place, _, _): place.guideName
        case .closest: "No nearby site"
        case .noUsableLocation: entry.locationAllowed ? "Location unavailable" : "Location off"
        case .needsPreciseLocation: "Precise Location off"
        case .noPlaces: "RivianSpotter"
        }
    }

    @ViewBuilder private var detail: some View {
        switch entry.suggestion {
        case .nearby(let place, _, _):
            if entry.failed {
                Text("Couldn't check in. Open RivianSpotter.").font(.caption).lineLimit(2)
            } else if entry.justCheckedIn {
                Text("✓ Checked In").font(.subheadline.weight(.semibold))
            } else {
                Button(intent: CheckInIntent(placeID: place.id)) {
                    Text("Check In").font(.subheadline.weight(.bold))
                        .padding(.horizontal, 12).padding(.vertical, 3)
                        .background(.white.opacity(0.25), in: Capsule())
                }.buttonStyle(.plain)
            }
        case .closest(let place, let meters):
            Text("Nearest: \(place.guideName) · \(CheckInCopy.miles(meters, nearby: false))").font(.subheadline).lineLimit(2)
        case .noUsableLocation where entry.locationAllowed:
            Button(intent: RefreshIntent()) { Text("Tap ↻ to try again").font(.subheadline) }.buttonStyle(.plain)
        case .noUsableLocation: Text("Open RivianSpotter to allow location").font(.subheadline).lineLimit(2)
        case .needsPreciseLocation: Text("Turn on Precise Location to check in").font(.subheadline).lineLimit(2)
        case .noPlaces: Text("Open RivianSpotter").font(.subheadline)
        }
    }
}
