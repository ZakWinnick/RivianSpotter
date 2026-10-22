import SwiftUI
#if SWIFT_PACKAGE
import SpotterCore
#endif

extension Color {
    init(hex: String) {
        let value = UInt32(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xa3a3a3
        self.init(.sRGB, red: Double((value >> 16) & 255) / 255,
                  green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255, opacity: 1)
    }
}

struct ReliabilityBadge: View {
    let value: PlaceReliability
    var compact = false
    @ScaledMetric private var scale = 1.0
    var body: some View {
        Text(value.grade).font(.system(size: (compact ? 19 : 30) * scale, weight: .heavy))
            .foregroundStyle(Color(hex: value.foreground))
            .frame(width: (compact ? 36 : 54) * scale, height: (compact ? 36 : 54) * scale)
            .background(Color(hex: value.background), in: RoundedRectangle(cornerRadius: compact ? 9 : 12))
            .overlay(RoundedRectangle(cornerRadius: compact ? 9 : 12)
                .stroke(Color(hex: value.background).opacity(compact ? 0 : 0.18), lineWidth: 7))
            .fixedSize().accessibilityLabel("Reliability grade \(value.grade)")
    }
}

struct PlaceLabels: View {
    let place: Place
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        TagFlow(spacing: 6) {
            ForEach(place.types) { type in
                Label(type.displayName, systemImage: type.symbol)
                    .guideFont(11, .semibold)
                    .foregroundStyle(type.browseColor(in: scheme))
                    .padding(.horizontal, 8).padding(.vertical, 5)
                    .background(type.browseColor(in: scheme).opacity(0.10), in: RoundedRectangle(cornerRadius: 5))
            }
            if place.status == "planned" || !place.listed || place.status == "temporarily-closed" || place.status == "closed" {
                Text(place.statusLabel).guideFont(11, .semibold)
                    .foregroundStyle(place.status == "planned" ? Color(hex: "#b4621a") : .secondary)
                    .padding(.horizontal, 8).padding(.vertical, 5)
                    .overlay(RoundedRectangle(cornerRadius: 5).stroke(place.status == "planned" ? Color(hex: "#b4621a") : .secondary, lineWidth: 1))
            }
        }
    }
}

struct WebsiteTags: View {
    let values: [String]
    var body: some View {
        TagFlow(spacing: 8) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                Text(value).font(.footnote).padding(.horizontal, 10).padding(.vertical, 5)
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.secondary.opacity(0.25), lineWidth: 1))
            }
        }
    }
}

/// Wrap long location names and tags at the available width, including accessibility sizes.
struct TagFlow: Layout {
    var spacing: CGFloat = 8
    private func arrangement(_ proposal: ProposedViewSize, _ subviews: Subviews) -> (CGSize, [CGPoint]) {
        let width = max(1, proposal.width ?? 600)
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        var points: [CGPoint] = []
        for view in subviews {
            let size = view.sizeThatFits(.init(width: width, height: nil))
            if x > 0 && x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            points.append(.init(x: x, y: y))
            x += size.width + spacing; rowHeight = max(rowHeight, size.height)
        }
        return (.init(width: width, height: y + rowHeight), points)
    }
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrangement(proposal, subviews).0
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let points = arrangement(.init(width: bounds.width, height: nil), subviews).1
        for (index, view) in subviews.enumerated() {
            view.place(at: .init(x: bounds.minX + points[index].x, y: bounds.minY + points[index].y),
                       anchor: .topLeading, proposal: .init(width: bounds.width, height: nil))
        }
    }
}

struct PlaceMapMarker: View {
    let places: [Place]
    private var type: PlaceType { places.first?.browseTypes.first ?? .space }
    private var planned: Bool { places.count == 1 && places[0].status == "planned" }
    private var combined: Bool { places.count == 1 && places[0].browseTypes.contains(.ran) && places[0].browseTypes.contains(.waypoint) }
    private var color: Color {
        Set(places.flatMap(\.browseTypes)).count > 1 && places.count > 1 ? Color(hex: "#37483d") : Color(hex: type.mapColorHex)
    }
    var body: some View {
        ZStack {
            Circle().fill(planned ? Color(hex: "#f8f7f3") : color)
            Circle().stroke(combined ? Color(hex: "#7062a4") : planned ? color : .white, lineWidth: combined || planned ? 3 : 2)
            if places.count > 1 {
                Text(String(places.count)).font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
            } else {
                Image(systemName: type.symbol).font(.system(size: 14, weight: .semibold)).foregroundStyle(planned ? color : .white)
            }
        }.frame(width: 34, height: 34)
    }
}

extension View {
    func detailAction(primary: Bool = false) -> some View { modifier(DetailAction(primary: primary)) }
}
private struct DetailAction: ViewModifier {
    let primary: Bool
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        let color = GuidePalette(scheme: scheme).accent
        content.font(.subheadline.weight(.semibold)).padding(.horizontal, 14).frame(minHeight: 44)
            .foregroundStyle(primary ? (scheme == .dark ? Color(hex: "#17231b") : .white) : color)
            .background(primary ? color : .clear, in: RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(primary ? color : color.opacity(0.3), lineWidth: 1))
    }
}

struct DemoBookingButton: View {
    let url: URL
    @State private var showingBooking = false
    var body: some View {
        #if os(iOS)
        Button { showingBooking = true } label: { Label("Book Demo", systemImage: "steeringwheel").cardButton() }
            .buttonStyle(.plain).sheet(isPresented: $showingBooking) { DemoBookingPage(url: url).ignoresSafeArea() }
        #else
        Link(destination: url) { Label("Book Demo", systemImage: "steeringwheel").cardButton() }
        #endif
    }
}
#if os(iOS)
import SafariServices
private struct DemoBookingPage: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController { SFSafariViewController(url: url) }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
#endif

/// The complete key stays visible at phone widths and wraps for larger text sizes.
struct MapKey: View {
    var body: some View {
        TagFlow(spacing: 10) {
            ForEach(PlaceType.allCases) { type in
                Label {
                    Text(type == .ran ? "RAN" : type.browseTitle)
                } icon: {
                    Circle().fill(Color(hex: type.mapColorHex)).frame(width: 9, height: 9)
                }.accessibilityLabel(type.displayName)
            }
            Label("Coming Soon", systemImage: "circle")
        }.font(.caption2)
    }
}
