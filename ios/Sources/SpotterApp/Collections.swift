import SwiftUI
import Charts
#if SWIFT_PACKAGE
import SpotterCore
#endif

// MARK: - Visit receipts

/// Facades-style visit receipt: the place, where it is, and the visit date. The private note is
/// never part of a receipt, so receipts are safe to share.
struct ReceiptCard: View {
    let visit: Visit
    var image: Image? = nil
    var compact = false
    private static let paper = Color(red: 0.93, green: 0.96, blue: 0.93)
    private static let ink = Color.guide(0.34, 0.06, 155)
    private var place: Place { visit.place }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                if let image { image.resizable().scaledToFill() } else { PlaceImageView(place: place) }
            }.frame(height: compact ? 64 : 150).frame(maxWidth: .infinity).clipped()
                .overlay(LinearGradient(colors: [.clear, Self.paper], startPoint: .center, endPoint: .bottom))
            VStack(alignment: .leading, spacing: compact ? 3 : 6) {
                Text(place.guideTitle).font(compact ? .subheadline.bold() : .title2.bold()).lineLimit(compact ? 2 : 3)
                Text("\(place.city), \(RegionNames.name(place.region))").font(compact ? .caption2 : .subheadline).opacity(0.75)
                if !compact { Rectangle().fill(Self.ink.opacity(0.2)).frame(height: 1).padding(.vertical, 6) }
                Label("Visited", systemImage: "checkmark.seal.fill").font(compact ? .caption2 : .subheadline).opacity(0.8)
                Text(visit.visitedAt.formatted(date: compact ? .abbreviated : .long, time: .omitted))
                    .font(compact ? .caption.weight(.semibold) : .title3.weight(.semibold))
            }.padding(.horizontal, compact ? 10 : 18).padding(.top, compact ? 0 : 4)
            Spacer(minLength: compact ? 8 : 18)
            HStack(alignment: .bottom) {
                Text(visit.type == .ran ? "RAN" : visit.type.rawValue).font(.system(compact ? .caption2 : .footnote, design: .monospaced))
                    .opacity(0.7)
                Spacer()
                Image(systemName: visit.type.symbol).font(.system(size: compact ? 13 : 20, weight: .semibold))
                    .foregroundStyle(.white).frame(width: compact ? 24 : 40, height: compact ? 24 : 40)
                    .background(Color(hex: visit.type.mapColorHex), in: RoundedRectangle(cornerRadius: compact ? 6 : 10))
            }.padding(compact ? 10 : 18)
        }
        .foregroundStyle(Self.ink)
        .frame(width: compact ? nil : 300, height: compact ? 210 : 470)
        .frame(maxWidth: compact ? .infinity : nil)
        .background(Self.paper)
        .clipShape(RoundedRectangle(cornerRadius: compact ? 12 : 22))
        .environment(\.colorScheme, .light)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Visit receipt: \(place.name), \(place.cardLocality), visited \(visit.visitedAt.formatted(date: .long, time: .omitted))")
    }
}

/// Every visit as a receipt, newest first, like Facades' Visit Receipts list.
struct ReceiptsView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var opened: ReceiptSelection?
    struct ReceiptSelection: Identifiable { let id: UUID }
    var body: some View {
        ScrollView {
            if store.visits.isEmpty {
                EmptyCollection(symbol: "ticket", title: "No Receipts",
                                message: "Each visit you record becomes a receipt you can save or share. Notes stay private.")
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                    ForEach(store.visits) { visit in
                        Button { opened = ReceiptSelection(id: visit.id) } label: { ReceiptCard(visit: visit, compact: true) }
                            .buttonStyle(.plain)
                    }
                }.padding(16)
                Text("\(store.visits.count) \(store.visits.count == 1 ? "Receipt" : "Receipts")").font(.footnote)
                    .foregroundStyle(.secondary).padding(.bottom, 20)
            }
        }.background(GuidePalette(scheme: scheme).paper)
            .navigationTitle("Visit Receipts").inlineNavigationTitle()
            .sheet(item: $opened) { selection in
                ReceiptSheet(visits: store.visits, start: selection.id).spotterEnvironment(store)
            }
    }
}

/// Swipe between receipts; save or share each one as an image, or edit the visit.
struct ReceiptSheet: View {
    let visits: [Visit]
    var start: UUID? = nil
    var addVisit: (() -> Void)? = nil
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var current: UUID?
    @State private var editing: Visit?
    @State private var images: [String: Image] = [:]
    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                TabView(selection: $current) {
                    ForEach(visits) { visit in
                        ReceiptCard(visit: visit, image: images[visit.place.id]).shadow(color: .black.opacity(0.18), radius: 14, y: 6)
                            .tag(Optional(visit.id))
                            .task { if images[visit.place.id] == nil, let image = await loadPlaceImage(visit.place) { images[visit.place.id] = image } }
                    }
                }
                #if os(iOS)
                .tabViewStyle(.page(indexDisplayMode: visits.count > 1 ? .always : .never))
                .indexViewStyle(.page(backgroundDisplayMode: .always))
                #endif
                if let visit = visits.first(where: { $0.id == current }) ?? visits.first, let rendered = render(visit) {
                    ShareLink(item: rendered, preview: SharePreview("\(visit.place.guideName) visit receipt", image: rendered)) {
                        Label("Save or Share Image", systemImage: "square.and.arrow.down").font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 18).frame(minHeight: 44)
                            .foregroundStyle(GuidePalette(scheme: scheme).onAccent).background(GuidePalette(scheme: scheme).accent, in: Capsule())
                    }.buttonStyle(.plain)
                }
                Text("Receipts show the place and date. Your notes stay private.").font(.caption).foregroundStyle(.secondary)
            }.padding(.bottom, 16)
                .background(GuidePalette(scheme: scheme).paper)
                .navigationTitle(visits.count == 1 ? "Visit Receipt" : "Visit Receipts").inlineNavigationTitle()
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            if let visit = visits.first(where: { $0.id == current }) ?? visits.first {
                                Button { editing = visit } label: { Label("Edit Visit", systemImage: "pencil") }
                            }
                            if let addVisit {
                                Button { dismiss(); addVisit() } label: { Label("Add Visit", systemImage: "plus") }
                            }
                        } label: { Image(systemName: "ellipsis.circle") }.accessibilityLabel("More")
                    }
                }
        }
        .onAppear { current = start ?? visits.first?.id }
        .sheet(item: $editing) { VisitEditor(visit: $0).spotterEnvironment(store) }
        .onChange(of: store.visits) { _, now in
            // Close when the last receipt shown here was deleted.
            if !visits.contains(where: { visit in now.contains { $0.id == visit.id } }) { dismiss() }
        }
    }
    @MainActor private func render(_ visit: Visit) -> Image? {
        let renderer = ImageRenderer(content: ReceiptCard(visit: visit, image: images[visit.place.id]).padding(24).background(Color.white))
        renderer.scale = 3
        #if os(iOS)
        return renderer.uiImage.map { Image(uiImage: $0) }
        #else
        return renderer.nsImage.map { Image(nsImage: $0) }
        #endif
    }
}

// MARK: - Location Data

/// Facades' Store Data, using only counts from the published directory.
struct LocationDataView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        let places = store.places
        let fast = places.filter { $0.browseTypes.contains(.ran) }
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                heading("Directory", "Every listed location, including coming soon. Locations of more than one type count in each.")
                chartCard("By Location Type") {
                    Chart(PlaceType.allCases) { type in
                        BarMark(x: .value("Locations", places.filter { $0.browseTypes.contains(type) }.count),
                                y: .value("Type", type == .ran ? "RAN" : type.browseTitle))
                            .foregroundStyle(Color(hex: type.mapColorHex)).annotation(position: .trailing) {
                                Text("\(places.filter { $0.browseTypes.contains(type) }.count)").font(.caption2).foregroundStyle(.secondary)
                            }
                    }.frame(height: 220)
                }
                chartCard("By State or Province") {
                    let regions = Dictionary(grouping: places, by: \.region).map { (code: $0.key, count: $0.value.count) }.sorted { $0.code < $1.code }
                    Chart(regions, id: \.code) { item in
                        BarMark(x: .value("State", item.code), y: .value("Locations", item.count)).foregroundStyle(palette.accent)
                    }.chartXAxis {
                        // Label every third state so codes stay readable at phone widths.
                        AxisMarks(values: regions.enumerated().filter { $0.offset % 3 == 0 }.map(\.element.code))
                    }.frame(height: 180)
                }
                chartCard("Listed and Coming Soon") {
                    let groups = PlaceStatusGroup.allCases.map { status in (status: status, count: places.filter { $0.statusGroup == status }.count) }.filter { $0.count > 0 }
                    Chart(groups, id: \.status) { item in
                        BarMark(x: .value("Locations", item.count), y: .value("Status", item.status.rawValue))
                            .foregroundStyle(item.status == .comingSoon ? Color(hex: "#b4621a") : item.status == .listed ? palette.accent : .gray)
                            .annotation(position: .trailing) { Text("\(item.count)").font(.caption2).foregroundStyle(.secondary) }
                    }.frame(height: CGFloat(groups.count) * 44 + 20)
                }
                heading("Rivian Adventure Network", "Published station details, not live availability.")
                let power = Dictionary(grouping: fast.compactMap(\.maxKw), by: { $0 }).map { (kw: Int($0.key), count: $0.value.count) }.sorted { $0.kw < $1.kw }
                if power.count > 1 {
                    chartCard("Maximum Rated Power") {
                        Chart(power, id: \.kw) { item in
                            BarMark(x: .value("Power", "\(item.kw) kW"), y: .value("Sites", item.count)).foregroundStyle(Color(hex: PlaceType.ran.mapColorHex))
                        }.frame(height: 170)
                    }
                } else if let only = power.first {
                    chartCard("Maximum Rated Power") {
                        Text("Every listed site with published power is rated up to \(only.kw) kW (\(only.count) sites).").font(.subheadline)
                    }
                }
                chartCard("Chargers per Site") {
                    let chargers = Dictionary(grouping: fast.compactMap(\.chargerCount), by: { $0 }).map { (n: $0.key, count: $0.value.count) }.sorted { $0.n < $1.n }
                    Chart(chargers, id: \.n) { item in
                        BarMark(x: .value("Chargers", "\(item.n)"), y: .value("Sites", item.count)).foregroundStyle(Color(hex: PlaceType.ran.mapColorHex).opacity(0.8))
                    }.frame(height: 170)
                }
                heading("Site Features", "Features Rivian publishes for each location.")
                chartCard("Locations by Feature") {
                    let features = GlossaryEntry.features(in: places).map { feature in (name: feature, count: places.filter { $0.siteFeatures.contains(feature) }.count) }
                    Chart(features, id: \.name) { item in
                        BarMark(x: .value("Locations", item.count), y: .value("Feature", item.name))
                            .foregroundStyle(GlossaryEntry.feature(item.name).color)
                    }.frame(height: CGFloat(features.count) * 26 + 20)
                }
                if let checked = places.compactMap(\.checkedOn).max() {
                    Text("Listings last checked \(checked).").font(.caption).foregroundStyle(.secondary)
                }
            }.padding(16).frame(maxWidth: 900).frame(maxWidth: .infinity)
        }.background(palette.paper)
            .navigationTitle("Location Data").inlineNavigationTitle()
    }
    private func heading(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.title3.bold())
            Text(detail).font(.footnote).foregroundStyle(.secondary)
        }.padding(.top, 8)
    }
    private func chartCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline)
            content()
        }.padding(14).frame(maxWidth: .infinity, alignment: .leading)
            .background(palette.surface, in: RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Settings

/// Facades' Settings sheet: the app, then one grouped section per setting, each with its
/// explanation directly beneath it.
struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @EnvironmentObject private var sync: CloudSyncStatus
    @EnvironmentObject private var store: SpotterStore
    @AppStorage("appearance") private var appearance = AppAppearance.system.rawValue
    @State private var showBaseCampPicker = false
    private var version: String {
        let info = Bundle.main.infoDictionary
        return [info?["CFBundleShortVersionString"] as? String, (info?["CFBundleVersion"] as? String).map { "(\($0))" }]
            .compactMap { $0 }.joined(separator: " ")
    }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 6) {
                        IconTile(symbol: "binoculars.fill", color: .guide(0.38, 0.055, 155), size: 64)
                        Text("Rivian Spotter").font(.title2.bold())
                        if !version.isEmpty { Text("Version \(version)").font(.footnote).foregroundStyle(.secondary) }
                    }.frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        settingLabel("Appearance", "circle.lefthalf.filled", .indigo)
                        Picker("Appearance", selection: $appearance) {
                            ForEach(AppAppearance.allCases) { Text($0.rawValue).tag($0.rawValue) }
                        }.pickerStyle(.segmented).labelsHidden()
                    }.padding(.vertical, 4)
                } footer: { Text("System follows your device’s Light or Dark appearance.") }
                Section {
                    Button { showBaseCampPicker = true } label: {
                        HStack {
                            settingLabel("Base Camp", "tent.fill", .brown)
                            Spacer()
                            Text(store.baseCamp?.guideName ?? "Choose").foregroundStyle(.secondary).lineLimit(1)
                            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                        }
                    }.foregroundStyle(.primary)
                } footer: { Text("The location you think of as home. It syncs privately with iCloud.") }
                Section {
                    settingLabel("Location Updates", "arrow.triangle.2.circlepath", .blue)
                    Text(store.catalogCheckedAt.map { "Last checked \($0.formatted(date: .abbreviated, time: .shortened))" }
                         ?? "Using the location directory included with this app.").font(.footnote).foregroundStyle(.secondary)
                    if let notice = store.catalogNotice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
                    Button(store.updatingCatalog ? "Checking…" : "Check for Updates") {
                        Task { await store.refreshCatalog(force: true) }
                    }.disabled(store.updatingCatalog)
                } footer: { Text("The directory updates from RivianSpotter when you open the app. Your visits and notes stay private.") }
                Section {
                    settingLabel("iCloud & Storage", "icloud.fill", .cyan)
                    Text(sync.title).font(.subheadline.weight(.semibold))
                    Text(sync.detail).font(.footnote).foregroundStyle(.secondary)
                    if let notice = store.storageNotice {
                        Label(notice, systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.secondary)
                    }
                    ExportJournalButton()
                } footer: { Text("Visits, notes, saved places, and Base Camp are private. Nothing is published when you check in.") }
                #if os(iOS)
                ArrivalDetectionSection(monitor: store.arrival)
                #endif
                Section {
                    settingLabel("Location", "location.fill", .green)
                    Text("Sort by Nearest and the check-in widget use your location to find places near you. Your location stays on this device and isn’t saved or synced. You can record a visit without location access.")
                        .font(.footnote).foregroundStyle(.secondary)
                    #if os(iOS)
                    if let url = URL(string: UIApplication.openSettingsURLString) { Link("Location Settings", destination: url) }
                    #endif
                }
            }
            .navigationTitle("Settings").inlineNavigationTitle()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .tint(GuidePalette(scheme: scheme).accent)
        #if os(macOS)
        .preferredColorScheme((AppAppearance(rawValue: appearance) ?? .system).colorScheme)
        #endif
        .sheet(isPresented: $showBaseCampPicker) { BaseCampPicker().spotterEnvironment(store) }
        #if os(macOS)
        .frame(width: 440, height: 680)
        #endif
    }
    private func settingLabel(_ title: String, _ symbol: String, _ color: Color) -> some View {
        Label { Text(title).font(.body.weight(.semibold)) } icon: { IconTile(symbol: symbol, color: color, size: 28) }
    }
}

#if os(iOS)
private struct ArrivalDetectionSection: View {
    @ObservedObject var monitor: ArrivalMonitor
    var body: some View {
        Section {
            Toggle(isOn: Binding(get: { monitor.enabled }, set: { monitor.setEnabled($0) })) {
                Label { Text("Update widget when I arrive").font(.body.weight(.semibold)) } icon: {
                    IconTile(symbol: "location.circle.fill", color: .orange, size: 28)
                }
            }
            if let notice = monitor.notice {
                Text(notice).font(.footnote).foregroundStyle(.secondary)
                if let url = URL(string: UIApplication.openSettingsURLString) { Link("Open Settings", destination: url) }
            }
        } footer: { Text("Lets iOS wake RivianSpotter when you arrive at a Rivian place so the widget is ready. Requires Always location. Your location stays on this device.") }
    }
}
#endif
