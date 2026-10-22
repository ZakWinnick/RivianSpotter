import SwiftUI
import MapKit
#if SWIFT_PACKAGE
import SpotterCore
#endif
#if os(iOS)
import UIKit
#else
import AppKit
#endif

/// Facades "Store Details": photo, name, pills, feature chips, then grouped cards.
struct PlaceDetail: View {
    let placeID: String
    @EnvironmentObject private var store: SpotterStore
    var body: some View {
        if let place = store.place(id: placeID) {
            PlaceDetailContent(place: place)
        } else {
            ContentUnavailableView("Location unavailable", systemImage: "mappin.slash",
                                   description: Text("This location is no longer in the directory."))
        }
    }
}

private enum DetailSheet: Identifiable {
    case address, checkIn, receipts, info(GlossaryEntry), edit(Visit)
    var id: String {
        switch self {
        case .address: "address"
        case .checkIn: "checkIn"
        case .receipts: "receipts"
        case .info(let entry): "info:\(entry.id)"
        case .edit(let visit): "edit:\(visit.id)"
        }
    }
}

private struct PlaceDetailContent: View {
    let place: Place
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var sheet: DetailSheet?
    @State private var actionError: String?
    private var palette: GuidePalette { .init(scheme: scheme) }
    private var visits: [Visit] { store.visits(to: place) }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                PlaceDetailPhoto(place: place)
                HStack(alignment: .top, spacing: 12) {
                    Text(place.guideName).font(.title.bold()).fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 0)
                    if let grade = place.reliability, place.status != "planned" { ReliabilityBadge(value: grade, compact: true) }
                }.padding(.top, 4)
                pills
                if !place.siteFeatures.isEmpty {
                    TagFlow(spacing: 6) {
                        ForEach(place.siteFeatures, id: \.self) { feature in
                            Button { sheet = .info(.feature(feature)) } label: { Pill(text: feature, style: .chip) }
                                .buttonStyle(.plain).accessibilityHint("Shows what this feature means")
                        }
                    }
                }
                addressCard.padding(.top, 4)
                actions
                if place.hours != nil || place.serviceHours != nil {
                    InfoCard(title: "Hours", symbol: "clock.fill", color: .blue) {
                        if let hours = place.hours { DetailFact(title: "Visiting hours", value: hours) }
                        if let hours = place.serviceHours { DetailFact(title: "Service hours", value: hours) }
                    }
                }
                recordCard
                ForEach(Array((place.information ?? []).enumerated()), id: \.offset) { _, section in
                    informationCard(section)
                }
                nearbyCard
                visitsCard
                HStack(spacing: 10) {
                    if let url = place.websiteURL {
                        Link(destination: url) { Label("Website", systemImage: "link").cardButton() }
                    }
                    if let url = place.websiteURL {
                        ShareLink(item: url, subject: Text(place.name)) { Label("Share", systemImage: "square.and.arrow.up").cardButton() }
                    }
                }.buttonStyle(.plain)
            }.padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 28)
                .frame(maxWidth: 680).frame(maxWidth: .infinity)
        }
        .background(palette.paper)
        .navigationTitle("Location Details").inlineNavigationTitle()
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    if !store.perform({ try $0.toggleSaved(place) }) { actionError = store.takeError() }
                } label: { Image(systemName: store.isSaved(place) ? "bookmark.fill" : "bookmark") }
                    .disabled(!store.ready)
                    .accessibilityLabel(store.isSaved(place) ? "Remove from Saved" : "Save location")
                Menu {
                    Button { sheet = .checkIn } label: { Label("Add Visit", systemImage: "checkmark.seal") }
                    if store.isBaseCamp(place) {
                        Button(role: .destructive) { setBaseCamp(nil) } label: { Label("Remove as Base Camp", systemImage: "tent") }
                    } else {
                        Button { setBaseCamp(place) } label: { Label("Make Base Camp", systemImage: "tent") }
                    }
                } label: { Image(systemName: "ellipsis.circle") }
                    .disabled(!store.ready).accessibilityLabel("More")
            }
        }
        .sheet(item: $sheet) { item in
            switch item {
            case .address: AddressSheet(place: place)
            case .checkIn: CheckInView(place: place)
            case .receipts: ReceiptSheet(visits: visits, addVisit: { sheet = .checkIn })
            case .info(let entry): GlossarySheet(entry: entry)
            case .edit(let visit): VisitEditor(visit: visit)
            }
        }
        .actionError($actionError)
    }
    private func setBaseCamp(_ value: Place?) {
        if !store.perform({ try $0.setBaseCamp(value) }) { actionError = store.takeError() }
    }

    private var pills: some View {
        TagFlow(spacing: 6) {
            ForEach(place.browseTypes) { type in
                Button { sheet = .info(.type(type)) } label: {
                    Pill(text: type == .ran ? "RAN" : type.rawValue, style: .filled(Color(hex: type.mapColorHex)))
                }.buttonStyle(.plain).accessibilityLabel(type.displayName).accessibilityHint("Shows what this location type is")
            }
            if ![.operating, .unconfirmed].contains(place.statusGroup) {
                Pill(text: place.statusLabel, style: .outlined(place.statusGroup == .comingSoon ? Color(hex: "#b4621a") : .secondary))
            }
            if store.isBaseCamp(place) { Pill(text: "Base Camp", symbol: "tent.fill", style: .filled(GuidePalette.forest)) }
            Button { sheet = visits.isEmpty ? .checkIn : .receipts } label: {
                if visits.isEmpty { Pill(text: "Visit", symbol: "plus", style: .chip) }
                else { Pill(text: visits.count == 1 ? "Visited" : "Visited \(visits.count)×", symbol: "checkmark.seal.fill", style: .filled(.visited), chevron: true) }
            }.buttonStyle(.plain).disabled(!store.ready)
                .accessibilityLabel(visits.isEmpty ? "Add a visit" : "Visited \(visits.count) \(visits.count == 1 ? "time" : "times"), show receipts")
        }
    }

    private var addressCard: some View {
        Button { sheet = .address } label: {
            InfoCard(title: "Address", symbol: "location.fill", color: .orange, chevron: true) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(place.address == nil ? "Street address not published\n\(place.postalAddress)" : place.postalAddress)
                        .font(.subheadline).fixedSize(horizontal: false, vertical: true)
                    if !place.hasMapCoordinates {
                        Text("No map pin published").font(.caption).foregroundStyle(.secondary).padding(.top, 4)
                    } else if !place.hasPreciseCoordinates {
                        Text("Approximate area · exact location not published").font(.caption).foregroundStyle(.secondary).padding(.top, 4)
                    }
                }
            }
        }.buttonStyle(.plain).accessibilityHint("Shows the map and address options")
    }

    @ViewBuilder private var actions: some View {
        let directions = place.directionsURL
        if directions != nil || place.phoneURL != nil || place.safeBookingURL != nil {
            HStack(spacing: 10) {
                if let directions {
                    Link(destination: directions) { Label("Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill").cardButton(prominent: true) }
                }
                if let url = place.phoneURL {
                    Link(destination: url) { Label("Call", systemImage: "phone.fill").cardButton() }
                }
                if let url = place.safeBookingURL { DemoBookingButton(url: url) }
            }.buttonStyle(.plain)
        }
    }

    /// Facades shows a store timeline. The directory has no opening history, so this card shows
    /// only what is published: the listed status and when the listing was last checked.
    private var recordCard: some View {
        InfoCard(title: "Record", symbol: "calendar", color: .indigo) {
            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Listing status: \(place.statusGroup == .unconfirmed ? "Not published" : place.statusLabel)")
                        .font(.subheadline.weight(.semibold))
                    if place.statusGroup == .unconfirmed {
                        Text("Rivian’s listing doesn’t say whether this location is open. Any reported charging status appears in the cards below.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                if let checked = place.checkedOn, let date = Self.isoDay.date(from: checked) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Listing checked: \(date.formatted(date: .long, time: .omitted))").font(.subheadline.weight(.semibold))
                        Text(date, format: .relative(presentation: .named)).font(.caption).foregroundStyle(.secondary)
                    }
                }
                if let url = place.safeSourceURL {
                    Link("Published source ↗", destination: url).font(.caption.weight(.semibold))
                }
            }
        }
    }
    private static let isoDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    @ViewBuilder private func informationCard(_ section: PlaceInformation) -> some View {
        let (symbol, color) = sectionStyle(section.title)
        if section.expandable {
            InfoCard(title: section.title, symbol: symbol, color: color) {
                DisclosureGroup("Show details") { informationFacts(section).padding(.top, 10) }
                    .font(.subheadline)
            }
        } else {
            InfoCard(title: section.title, symbol: symbol, color: color,
                     reliability: (place.information ?? []).filter { $0.metrics != nil }.count > 1 ? section.reliability : nil) {
                informationFacts(section)
            }
        }
    }
    private func sectionStyle(_ title: String) -> (String, Color) {
        if title.contains("pricing") { return ("dollarsign", .green) }
        if title == "Site features" { return ("sparkles", .pink) }
        if title.contains("charger") { return ("ev.charger.fill", Color(hex: PlaceType.ran.mapColorHex)) }
        if title.contains("Time-of-use") { return ("clock.fill", .teal) }
        if title == "Waypoints" { return ("bolt.car.fill", Color(hex: PlaceType.waypoint.mapColorHex)) }
        if title.contains("Network") { return ("bolt.fill", Color(hex: PlaceType.ran.mapColorHex)) }
        if title.contains("visit") { return ("figure.walk", palette.accent) }
        return ("info", .gray)
    }
    private func informationFacts(_ section: PlaceInformation) -> some View {
        let pricing = section.title.hasSuffix(" pricing")
        let metrics = section.metrics ?? (pricing ? Array(section.facts.prefix(2)) : nil)
        let facts = section.facts.filter { fact in
            if pricing && (metrics ?? []).contains(fact) { return false }
            if section.reliability != nil && fact.title == "Published reliability grade" { return false }
            if section.metrics != nil && ["Chargers", "Maximum rated power", "Vehicle access"].contains(fact.title) { return false }
            // Tags already appear as feature chips under the name.
            if !(section.tags ?? []).isEmpty && ["Amenities", "At this location"].contains(fact.title) { return false }
            return true
        }
        return VStack(alignment: .leading, spacing: 14) {
            if let metrics {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(Array(metrics.enumerated()), id: \.offset) { _, metric in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(metric.value).font(.title2.bold()).fixedSize(horizontal: false, vertical: true)
                            Text(metric.title).font(.caption).foregroundStyle(palette.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(10)
                            .background(palette.paper, in: RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            if section.metrics != nil {
                Text("Station details, not live charger availability. Check connector compatibility and host access rules before visiting.")
                    .font(.caption).foregroundStyle(palette.secondary)
            }
            ForEach(Array(facts.enumerated()), id: \.offset) { _, fact in
                if fact.title == "Connectors" { WebsiteTags(values: [fact.value]) }
                else { DetailFact(title: fact.title, value: fact.value) }
            }
            if let url = section.safeSourceURL { Link("Source ↗", destination: url).font(.caption.weight(.semibold)) }
        }.textSelection(.enabled)
    }

    @ViewBuilder private var nearbyCard: some View {
        let related = (place.relatedPlaceIDs ?? []).compactMap { store.place(id: $0) }
        if !related.isEmpty {
            InfoCard(title: "Also at This Site", symbol: "mappin.and.ellipse", color: .green) {
                ForEach(related) { nearby in
                    NavigationLink(value: Route.place(nearby.id)) {
                        HStack {
                            Text(nearby.guideName).font(.subheadline)
                            Text(nearby.cardCaption).font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
                        }.frame(minHeight: 36).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private var visitsCard: some View {
        InfoCard(title: "Your Visits", symbol: "checkmark.seal.fill", color: .visited) {
            if visits.isEmpty {
                Text("No visits recorded. Visits and notes are private.").font(.subheadline).foregroundStyle(palette.secondary)
            } else {
                ForEach(visits) { visit in
                    Button { sheet = .edit(visit) } label: {
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(visit.visitedAt.formatted(date: .long, time: .omitted)).font(.subheadline.weight(.semibold))
                                if !visit.note.isEmpty { Text(visit.note).font(.caption).foregroundStyle(.secondary).lineLimit(2) }
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
                        }.frame(minHeight: 36).contentShape(Rectangle())
                    }.buttonStyle(.plain).accessibilityHint("Edit or delete this visit")
                }
            }
            HStack(spacing: 16) {
                Button { sheet = .checkIn } label: { Label("Add Visit", systemImage: "plus").font(.subheadline.weight(.semibold)) }
                if !visits.isEmpty {
                    Button { sheet = .receipts } label: { Label("Receipts", systemImage: "ticket").font(.subheadline.weight(.semibold)) }
                }
            }.buttonStyle(.plain).foregroundStyle(palette.accent).frame(minHeight: 36).disabled(!store.ready)
        }
    }
}

/// A grouped card with a small colored icon tile, like Facades' Address and Timeline cards.
struct InfoCard<Content: View>: View {
    let title: String
    let symbol: String
    let color: Color
    var chevron = false
    var reliability: PlaceReliability? = nil
    @ViewBuilder let content: () -> Content
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                IconTile(symbol: symbol, color: color)
                Text(title).font(.headline).fixedSize(horizontal: false, vertical: true)
                if chevron { Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(.tertiary) }
                Spacer(minLength: 4)
                if let reliability { ReliabilityBadge(value: reliability, compact: true) }
            }.accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
            content()
        }.frame(maxWidth: .infinity, alignment: .leading).padding(14)
            .background(GuidePalette(scheme: scheme).surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(GuidePalette(scheme: scheme).line, lineWidth: 0.5))
            .contentShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct IconTile: View {
    let symbol: String
    let color: Color
    var size: CGFloat = 24
    @ScaledMetric(relativeTo: .body) private var scale = 1.0
    var body: some View {
        Image(systemName: symbol).font(.system(size: size * 0.55 * scale, weight: .semibold)).foregroundStyle(.white)
            .frame(width: size * scale, height: size * scale)
            .background(color.gradient, in: RoundedRectangle(cornerRadius: size * 0.27 * scale))
            .accessibilityHidden(true)
    }
}

/// Facades' small rounded labels: filled for the type and visits, gray for feature chips.
struct Pill: View {
    enum Style { case filled(Color), outlined(Color), chip }
    let text: String
    var symbol: String? = nil
    let style: Style
    var chevron = false
    var body: some View {
        HStack(spacing: 3) {
            if let symbol { Image(systemName: symbol).font(.caption2.weight(.bold)) }
            Text(text)
            if chevron { Image(systemName: "chevron.right").font(.caption2.weight(.bold)) }
        }.font(.caption.weight(.semibold)).lineLimit(1)
            .padding(.horizontal, 9).padding(.vertical, 4)
            .foregroundStyle(foreground).background(background, in: Capsule())
            .overlay { if case .outlined(let color) = style { Capsule().stroke(color, lineWidth: 1) } }
    }
    private var foreground: Color {
        switch style {
        case .filled: .white
        case .outlined(let color): color
        case .chip: .secondary
        }
    }
    private var background: Color {
        switch style {
        case .filled(let color): color
        case .outlined: .clear
        case .chip: Color.secondary.opacity(0.18)
        }
    }
}

extension View {
    /// Facades' wide rounded buttons under the place cards.
    func cardButton(prominent: Bool = false) -> some View { modifier(CardButton(prominent: prominent)) }
    func inlineNavigationTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}
private struct CardButton: ViewModifier {
    let prominent: Bool
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        let palette = GuidePalette(scheme: scheme)
        content.font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
            .foregroundStyle(prominent ? palette.onAccent : palette.accent)
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(prominent ? palette.accent : palette.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(palette.line, lineWidth: prominent ? 0 : 0.5))
    }
}

/// Facades' address sheet: a close-up map with Open in Maps and Copy Address.
struct AddressSheet: View {
    let place: Place
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var copied = false
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if place.hasMapCoordinates {
                        PlacesMap(places: [place], open: { _ in }, closeUp: true)
                            .frame(height: 260).clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    Text(place.postalAddress).font(.headline).textSelection(.enabled)
                    if place.address == nil { Text("Street address not published.").font(.caption).foregroundStyle(.secondary) }
                    if let url = place.directionsURL {
                        Link(destination: url) { sheetRow("Open in Maps", symbol: "map.fill", color: .orange) }.buttonStyle(.plain)
                    }
                    Button {
                        copy(place.postalAddress); copied = true
                    } label: { sheetRow(copied ? "Copied" : "Copy Address", symbol: "doc.on.doc.fill", color: GuidePalette(scheme: scheme).accent) }
                        .buttonStyle(.plain)
                }.padding(16)
            }.background(GuidePalette(scheme: scheme).paper)
                .navigationTitle("Address").inlineNavigationTitle()
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.presentationDetents([.medium, .large])
    }
    private func sheetRow(_ title: String, symbol: String, color: Color) -> some View {
        HStack(spacing: 10) {
            IconTile(symbol: symbol, color: color)
            Text(title).font(.body.weight(.semibold))
            Spacer()
        }.padding(14).background(GuidePalette(scheme: scheme).surface, in: RoundedRectangle(cornerRadius: 12))
            .contentShape(Rectangle())
    }
    private func copy(_ text: String) {
        #if os(iOS)
        UIPasteboard.general.string = text
        #else
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(text, forType: .string)
        #endif
    }
}
