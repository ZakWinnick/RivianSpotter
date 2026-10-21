import SwiftUI
import MapKit
import UniformTypeIdentifiers
#if SWIFT_PACKAGE
import SpotterCore
#endif

@MainActor
final class SpotterStore: ObservableObject {
    @Published private(set) var places: [Place] = []
    @Published private(set) var journal = Journal()
    @Published var error: String?
    @Published private(set) var ready = false
    @Published private(set) var unreadableRecordCount = 0
    private(set) var legacyJournalUnreadable = false
    private var repository: JournalRepository?
    private var catalogUpdates: CatalogUpdates?
    private var catalogCheck: Task<Void, Never>?
    private var lastCatalogAttempt: Date?
    @Published private(set) var updatingCatalog = false
    @Published private(set) var catalogCheckedAt: Date?
    /// The last failed check, shown in Settings. Automatic checks fail quietly (often just no
    /// signal); browsing screens show it only after the person asked to refresh.
    @Published private(set) var catalogNotice: String?
    @Published private var catalogNoticeRequested = false
    var catalogBanner: String? { catalogNoticeRequested ? catalogNotice : nil }
    let location = LocationService()
    let sync = CloudSyncStatus()

    init() {
        // A damaged bundled directory must not take the journal down with it.
        let bundled = try? Catalog.bundled()
        do {
            #if os(macOS)
            let storageName = "RivianSpotter-Preview"
            #else
            let storageName = "RivianSpotter"
            #endif
            let directory = try FileManager.default.url(for: .applicationSupportDirectory,
                in: .userDomainMask, appropriateFor: nil, create: true)
                .appendingPathComponent(storageName, isDirectory: true)
            let cacheURL = directory.appendingPathComponent("directory-cache.json")
            let cached = CatalogSnapshot.cached(at: cacheURL, unlessOlderThan: bundled)
            places = cached?.catalog.places ?? bundled?.places ?? []
            catalogCheckedAt = cached?.checkedAt
            catalogUpdates = CatalogUpdates(cacheURL: cacheURL, snapshot: cached,
                                            minimumRevision: bundled?.revision ?? 0)
            #if os(iOS) && !targetEnvironment(simulator)
            let cloudEnabled = true
            #else
            let cloudEnabled = false
            #endif
            let storage = try CloudJournalStorage(url: directory.appendingPathComponent("journal.sqlite"), cloudEnabled: cloudEnabled)
            legacyJournalUnreadable = try storage.migrate(from: directory.appendingPathComponent("journal.json")) == .unreadable
            let repository = try JournalRepository(storage: storage)
            self.repository = repository
            sync.start(storage: storage, enabled: cloudEnabled) { [weak self] in self?.refresh() }
            apply(repository)
            ready = true
        } catch { self.error = error.localizedDescription }
        if places.isEmpty, error == nil {
            error = "The location directory couldn’t be loaded. Your visits and notes are safe. Check for location updates in Settings."
        }
    }
    func refresh() {
        do { try repository?.reload(); if let repository { apply(repository) } }
        catch { self.error = error.localizedDescription }
    }
    func refreshCatalog(force: Bool = false) async {
        if force { catalogNoticeRequested = true }
        // Pull-to-refresh during the launch check waits for that check instead of ending at once.
        if let catalogCheck { await catalogCheck.value; return }
        guard let catalogUpdates else { return }
        if !force, let lastCatalogAttempt, Date().timeIntervalSince(lastCatalogAttempt) < 15 * 60 { return }
        lastCatalogAttempt = Date()
        updatingCatalog = true
        let check = Task {
            do {
                let update = try await catalogUpdates.refresh()
                places = update.catalog.places
                catalogCheckedAt = update.checkedAt
                catalogNotice = nil
                catalogNoticeRequested = false
            } catch {
                catalogNotice = "Couldn’t check for location updates. Showing the directory you already have."
            }
        }
        catalogCheck = check
        await check.value
        catalogCheck = nil
        updatingCatalog = false
    }
    func currentPlace(_ saved: Place) -> Place {
        Catalog(schemaVersion: 1, places: places).resolving(saved)
    }
    private func apply(_ repository: JournalRepository) {
        journal = repository.journal
        unreadableRecordCount = repository.unreadableRecordCount
    }
    /// Data that was kept but could not be shown. Informational: the journal stays usable.
    var storageNotice: String? {
        var parts: [String] = []
        if unreadableRecordCount > 0 {
            parts.append(unreadableRecordCount == 1
                ? "1 visit or saved place couldn’t be read, possibly because it was added with a newer version of RivianSpotter. It’s kept and will appear after you update."
                : "\(unreadableRecordCount) visits or saved places couldn’t be read, possibly because they were added with a newer version of RivianSpotter. They’re kept and will appear after you update.")
        }
        if legacyJournalUnreadable {
            parts.append("An older visit file on this device couldn’t be read. It was left untouched, and new visits save normally.")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }
    var visits: [Visit] { journal.visits.sorted { $0.visitedAt > $1.visitedAt } }
    func isSaved(_ place: Place) -> Bool {
        journal.savedPlaces.contains { $0.id == place.id || place.aliases.contains($0.id) }
    }
    func visits(to place: Place) -> [Visit] {
        visits.filter { $0.place.id == place.id || place.aliases.contains($0.place.id) }
    }
    @discardableResult
    func perform(_ action: (JournalRepository) throws -> Void) -> Bool {
        guard let repository else { error = JournalError.unreadable.localizedDescription; return false }
        do {
            try action(repository)
            apply(repository)
            return true
        } catch { self.error = error.localizedDescription; return false }
    }
    func export() -> Data? {
        do { return try repository?.export() }
        catch { self.error = error.localizedDescription; return nil }
    }
    func takeError() -> String? {
        let message = error
        error = nil
        return message
    }
}

// The same composition runs on iPhone and in the phone-sized desktop preview.
struct GuidePalette {
    let scheme: ColorScheme
    var paper: Color { scheme == .dark ? Color(white: 0.115) : Color(red: 0.95, green: 0.95, blue: 0.97) }
    var surface: Color { scheme == .dark ? Color(white: 0.18) : .white }
    var ink: Color { scheme == .dark ? Color(white: 0.95) : Color(white: 0.10) }
    var secondary: Color { scheme == .dark ? Color(white: 0.65) : Color(white: 0.43) }
    var line: Color { ink.opacity(0.10) }
    var accent: Color { scheme == .dark ? .guide(0.80, 0.07, 150) : .guide(0.38, 0.055, 155) }
    static let charcoal = Color(white: 0.10)
    static let forest = Color(hex: "#244e3c")
    static let cream = Color(white: 0.96)
    static let yellow = Color(hex: "#d8e7db")

}

extension Color {
    // OKLCH design tokens converted to sRGB for SwiftUI.
    static func guide(_ l: Double, _ c: Double, _ h: Double) -> Color {
        let a = c * cos(h * .pi / 180), b = c * sin(h * .pi / 180)
        let ll = pow(l + 0.3963377774 * a + 0.2158037573 * b, 3)
        let mm = pow(l - 0.1055613458 * a - 0.0638541728 * b, 3)
        let ss = pow(l - 0.0894841775 * a - 1.291485548 * b, 3)
        func gamma(_ x: Double) -> Double {
            min(1, max(0, x <= 0.0031308 ? 12.92 * x : 1.055 * pow(x, 1 / 2.4) - 0.055))
        }
        return Color(.sRGB, red: gamma(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss),
                     green: gamma(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss),
                     blue: gamma(-0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss), opacity: 1)
    }
}

private extension Place {
    var guideTitle: String {
        let prefix = "\(city), \(region)"
        guard !city.isEmpty, guideName.hasPrefix(prefix) else { return guideName }
        let suffix = guideName.dropFirst(prefix.count).trimmingCharacters(in: CharacterSet(charactersIn: " -"))
        return suffix.isEmpty ? city : suffix
    }
    var guideName: String {
        name.replacingOccurrences(of: " - Service + Demo Center", with: "")
            .replacingOccurrences(of: " - Service Center", with: "")
    }
    var directionsURL: URL? {
        guard status != "planned", listed else { return nil }
        var parts = URLComponents(string: "https://maps.apple.com/")!
        if hasPreciseCoordinates {
            parts.queryItems = [URLQueryItem(name: "daddr", value: "\(latitude!),\(longitude!)")]
        } else if let address {
            parts.queryItems = [URLQueryItem(name: "daddr", value: "\(address), \(locality)")]
        } else { return nil }
        return parts.url
    }
}

enum AppAppearance: String, CaseIterable, Identifiable {
    case system = "System", light = "Light", dark = "Dark"
    var id: String { rawValue }
    var colorScheme: ColorScheme? {
        switch self { case .system: nil; case .light: .light; case .dark: .dark }
    }
}

@main
struct RivianSpotterApp: App {
    @StateObject private var store = SpotterStore()
    @AppStorage("appearance") private var appearance = AppAppearance.system.rawValue
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store).environmentObject(store.location).environmentObject(store.sync)
                .preferredColorScheme((AppAppearance(rawValue: appearance) ?? .system).colorScheme)
            #if os(macOS)
                .frame(width: 440, height: 820)
            #endif
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        #endif
    }
}

private enum GuideTab: String, CaseIterable {
    case catalog = "Map", explore = "Browse", saved = "Saved", journal = "Visited"
    var symbol: String {
        switch self { case .catalog: "map"; case .explore: "list.bullet.rectangle"; case .saved: "bookmark"; case .journal: "checkmark.seal" }
    }
}

private struct SidebarVisibleKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    /// True in the wide layout, whose sidebar already offers Settings and the category list.
    var sidebarVisible: Bool {
        get { self[SidebarVisibleKey.self] }
        set { self[SidebarVisibleKey.self] = newValue }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab = GuideTab.explore
    @State private var mapRequest = 0
    @State private var selectedCategory: PlaceType?
    @State private var selectedPlace: Place?
    @State private var placeHistory: [Place] = []
    @State private var showSettings = false
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                if geometry.size.width >= 700 { sidebar.frame(width: 245) }
                ZStack {
                    browsing(wide: geometry.size.width >= 700).opacity(selectedPlace == nil ? 1 : 0)
                        .allowsHitTesting(selectedPlace == nil).accessibilityHidden(selectedPlace != nil)
                    if let place = selectedPlace {
                        PlaceDetail(place: store.currentPlace(place), back: { selectedPlace = placeHistory.popLast() }, open: { next in
                            placeHistory.append(place); selectedPlace = next
                        }).id(place.id).background(palette.paper)
                            .edgeSwipeBack { selectedPlace = placeHistory.popLast() }
                    }
                }.frame(maxWidth: .infinity, maxHeight: .infinity)
                    .environment(\.sidebarVisible, geometry.size.width >= 700)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if geometry.size.width < 700 {
                    HStack(spacing: 0) {
                        ForEach(GuideTab.allCases, id: \.self) { item in
                            Button { select(item) } label: {
                                VStack(spacing: 4) {
                                    Image(systemName: item.symbol).font(.system(size: 21))
                                    Text(item.rawValue).font(.system(size: 10, weight: .medium))
                                }.foregroundStyle(tab == item ? palette.accent : palette.secondary)
                                    .frame(maxWidth: .infinity, minHeight: 52).contentShape(Rectangle())
                            }.buttonStyle(.plain).accessibilityAddTraits(tab == item ? .isSelected : []).largeContentViewerIfAvailable()
                        }
                    }.padding(.horizontal, 12).background(.regularMaterial)
                        .overlay(alignment: .top) { Divider() }
                }
            }
        }
        // Keep the tab bar behind the keyboard, as a system tab bar does, instead of riding above it.
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .background(palette.paper).foregroundStyle(palette.ink).tint(palette.accent)
        .sheet(isPresented: $showSettings) { SettingsView() }
        .task { await store.refreshCatalog() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                store.refresh(); store.location.refreshAuthorization(); store.sync.refreshAccount()
                Task { await store.refreshCatalog() }
            }
        }
        .alert("Couldn’t complete that", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) {
            Button("OK") { store.error = nil }
        } message: { Text(store.error ?? "") }
    }
    /// The sidebar lists every category, so the wide layout skips the Browse page that repeats them.
    private func shownTab(wide: Bool) -> GuideTab { wide && tab == .explore ? .catalog : tab }
    @ViewBuilder private func browsing(wide: Bool) -> some View {
        if let kind = selectedCategory {
            CategoryBrowseView(kind: kind, open: { selectedPlace = $0 }, back: { selectedCategory = nil })
                .edgeSwipeBack(selectedPlace == nil ? { selectedCategory = nil } : nil)
        } else {
            switch shownTab(wide: wide) {
            case .catalog: CategoryBrowseView(kind: nil, open: { selectedPlace = $0 }, back: nil, mapRequest: mapRequest)
            case .explore: ExploreView(open: { selectedPlace = $0 }, choose: { selectedCategory = $0 })
            case .saved: SavedView(open: { selectedPlace = $0 }, explore: { select(.catalog) })
            case .journal: JournalView(explore: { select(.catalog) })
            }
        }
    }
    private func select(_ item: GuideTab) {
        if item == .catalog { mapRequest += 1 }
        selectedPlace = nil; placeHistory = []; selectedCategory = nil; tab = item
    }
    private var sidebar: some View {
        VStack(spacing: 0) {
            HStack {
                Text("RivianSpotter").font(.headline)
                Spacer()
                Button { showSettings = true } label: { Image(systemName: "gearshape") }
                    .buttonStyle(.plain).accessibilityLabel("Settings")
            }.padding(18)
            List {
                Section("\(store.places.count) Locations") {
                    ForEach(GuideTab.allCases.filter { $0 != .explore }, id: \.self) { item in
                        Button { select(item) } label: { Label(item.rawValue, systemImage: item.symbol) }
                            .buttonStyle(.plain)
                            .listRowBackground(shownTab(wide: true) == item && selectedCategory == nil ? palette.accent.opacity(0.18) : .clear)
                    }
                }
                Section("Charging") { sidebarCategory(.ran); sidebarCategory(.waypoint) }
                Section("Rivian Places") {
                    sidebarCategory(.space); sidebarCategory(.demo); sidebarCategory(.service); sidebarCategory(.outpost)
                }
            }.listStyle(.sidebar).scrollContentBackground(.hidden)
        }.background(palette.surface.opacity(0.35)).overlay(alignment: .trailing) { Divider() }
    }
    private func sidebarCategory(_ kind: PlaceType) -> some View {
        Button { selectedPlace = nil; placeHistory = []; selectedCategory = kind; tab = .explore } label: {
            Label {
                Text(kind.browseTitle)
            } icon: {
                Image(systemName: kind.symbol).foregroundStyle(kind.browseColor(in: scheme))
            }
        }.buttonStyle(.plain).listRowBackground(selectedCategory == kind ? palette.accent.opacity(0.18) : .clear)
    }
}

private struct GuideHeader: View {
    let title: String
    let subtitle: String
    @Environment(\.colorScheme) private var scheme
    @Environment(\.sidebarVisible) private var sidebarVisible
    @State private var showSettings = false
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title).font(.largeTitle.bold())
                Spacer()
                if !sidebarVisible {
                    Button { showSettings = true } label: { Image(systemName: "gearshape").frame(width: 44, height: 44) }
                        .buttonStyle(.plain).accessibilityLabel("Settings")
                }
            }
            Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
        }.sheet(isPresented: $showSettings) { SettingsView() }
    }
}

private struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @EnvironmentObject private var sync: CloudSyncStatus
    @EnvironmentObject private var store: SpotterStore
    @AppStorage("appearance") private var appearance = AppAppearance.system.rawValue
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SheetHeader(title: "Settings", close: { dismiss() }).padding(.horizontal, 24).padding(.top, 12)
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Appearance").guideFont(22, .bold)
                        Picker("Appearance", selection: $appearance) {
                            ForEach(AppAppearance.allCases) { Text($0.rawValue).tag($0.rawValue) }
                        }.pickerStyle(.segmented)
                        Text("System follows your device’s Light or Dark appearance.")
                            .guideFont(14).foregroundStyle(palette.secondary)
                    }
                    Divider()
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Location Updates", systemImage: "arrow.triangle.2.circlepath").guideFont(20, .bold)
                        if let date = store.catalogCheckedAt {
                            Text("Last checked \(date.formatted(date: .abbreviated, time: .shortened))")
                                .guideFont(14).foregroundStyle(palette.secondary)
                        } else {
                            Text("Using the location directory included with this app.").guideFont(14).foregroundStyle(palette.secondary)
                        }
                        Text("The directory updates from RivianSpotter when you open the app. Saved places show the latest details, and your visits and notes stay private.")
                            .guideFont(14).foregroundStyle(palette.secondary)
                        if let notice = store.catalogNotice { Text(notice).guideFont(14).foregroundStyle(palette.secondary) }
                        Button(store.updatingCatalog ? "Checking…" : "Check for Updates") {
                            Task { await store.refreshCatalog(force: true) }
                        }.buttonStyle(.plain).guideFont(15, .semibold).foregroundStyle(palette.accent)
                            .frame(minHeight: 44).disabled(store.updatingCatalog)
                    }
                    Divider()
                    VStack(alignment: .leading, spacing: 12) {
                        Label("iCloud & Storage", systemImage: "icloud").guideFont(20, .bold)
                        Text(sync.title).guideFont(15, .semibold)
                        Text(sync.detail).guideFont(14).foregroundStyle(palette.secondary).lineSpacing(4)
                        if let notice = store.storageNotice {
                            Label(notice, systemImage: "exclamationmark.triangle")
                                .guideFont(14).foregroundStyle(palette.secondary).lineSpacing(4)
                        }
                        Text("Visits, notes, and saved places are private. Nothing is published when you check in.")
                            .guideFont(14).foregroundStyle(palette.secondary).lineSpacing(4)
                        ExportJournalButton()
                    }
                    Divider()
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Location", systemImage: "location").guideFont(20, .bold)
                        Text("Tap Near me to find nearby places. Your device location is not saved or synced with your journal. You can record a visit without location access.")
                            .guideFont(14).foregroundStyle(palette.secondary).lineSpacing(4)
                        #if os(iOS)
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            Link("Location Settings", destination: url).guideFont(15, .semibold)
                        }
                        #endif
                    }
                }.padding(24)
            }
        }.background(palette.paper).foregroundStyle(palette.ink).tint(palette.accent)
            .preferredColorScheme((AppAppearance(rawValue: appearance) ?? .system).colorScheme)
        #if os(macOS)
            .frame(width: 420, height: 650)
        #endif
    }
}

private struct SectionLabel: View {
    let title: String
    var detail: String = ""
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack {
            Text(title).guideFont(17, .semibold)
            Spacer()
            Text(detail).guideFont(15).foregroundStyle(GuidePalette(scheme: scheme).secondary)
        }
    }
}

private struct PrimaryAction: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.guideFont(17, .semibold)
            .foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 48)
            .background(GuidePalette.forest, in: RoundedRectangle(cornerRadius: 12))
            .opacity(enabled ? (configuration.isPressed ? 0.75 : 1) : 0.4)
    }
}

private enum ExploreMode: String, CaseIterable {
    case all = "All Locations", charging = "Charging", places = "Rivian Places"
}

extension PlaceType {
    var browseTitle: String {
        switch self {
        case .ran: "Rivian Adventure Network"
        case .waypoint: "Waypoints"
        case .space: "Spaces"
        case .demo: "Demo Centers"
        case .service: "Service Centers"
        case .outpost: "Outposts"
        }
    }
    var browseSubtitle: String {
        switch self {
        case .ran: "DC fast charging"
        case .waypoint: "Level 2 charging"
        case .space: "Meet Rivian"
        case .demo: "Get behind the wheel"
        case .service: "Care for your vehicle"
        case .outpost: "Recharge and explore"
        }
    }
    func browseColor(in scheme: ColorScheme) -> Color {
        switch self {
        case .ran, .waypoint: return Color(hex: mapColorHex)
        case .space: return scheme == .dark ? .guide(0.80, 0.07, 150) : .guide(0.38, 0.055, 155)
        case .demo: return scheme == .dark ? .guide(0.79, 0.07, 240) : .guide(0.42, 0.06, 240)
        case .service: return scheme == .dark ? .guide(0.79, 0.06, 55) : .guide(0.43, 0.04, 55)
        case .outpost: return scheme == .dark ? .guide(0.82, 0.08, 105) : .guide(0.39, 0.08, 105)
        }
    }
}

struct ExploreView: View {
    let open: (Place) -> Void
    let choose: (PlaceType) -> Void
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var showSettings = false
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Browse").font(.largeTitle.bold())
                Spacer()
                Button { showSettings = true } label: { Image(systemName: "gearshape").frame(width: 44, height: 44) }
                    .buttonStyle(.plain).accessibilityLabel("Settings")
            }.padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
            List {
                Section("Charging") { categoryRow(.ran); categoryRow(.waypoint) }
                Section("Rivian Places") { categoryRow(.space); categoryRow(.demo); categoryRow(.service); categoryRow(.outpost) }
                if let notice = store.catalogBanner {
                    Section { Text(notice).font(.footnote).foregroundStyle(.secondary) }
                }
            }.scrollContentBackground(.hidden)
                .refreshable { await store.refreshCatalog(force: true) }
            #if os(iOS)
            .listStyle(.insetGrouped)
            #else
            .listStyle(.inset)
            #endif
        }.sheet(isPresented: $showSettings) { SettingsView() }
    }
    private func categoryRow(_ kind: PlaceType) -> some View {
        Button { choose(kind) } label: {
            HStack(spacing: 12) {
                Image(systemName: kind.symbol).frame(width: 27, height: 27)
                    .foregroundStyle(kind.browseColor(in: scheme))
                    .background(kind.browseColor(in: scheme).opacity(0.10), in: RoundedRectangle(cornerRadius: 6))
                Text(kind.browseTitle).guideFont(16)
                Spacer()
                Text("\(store.places.filter { $0.browseTypes.contains(kind) }.count)").foregroundStyle(.secondary)
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .semibold)).foregroundStyle(.tertiary)
            }.padding(.vertical, 5).contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

private struct CategoryBrowseView: View {
    let kind: PlaceType?
    let open: (Place) -> Void
    let back: (() -> Void)?
    @Environment(\.sidebarVisible) private var sidebarVisible
    @EnvironmentObject private var store: SpotterStore
    @EnvironmentObject private var location: LocationService
    @Environment(\.colorScheme) private var scheme
    @State private var search = ""
    @FocusState private var searchFocused: Bool
    @State private var showMap: Bool
    @State private var unmappedOnly = false
    let mapRequest: Int
    @State private var filters = PlaceFilter()
    @State private var showFilters = false
    @State private var nearby = false
    @State private var showSettings = false
    @ScaledMetric(relativeTo: .body) private var cardWidth = 160.0
    private var palette: GuidePalette { .init(scheme: scheme) }
    init(kind: PlaceType?, open: @escaping (Place) -> Void, back: (() -> Void)?, mapRequest: Int = 0) {
        self.kind = kind; self.open = open; self.back = back; self.mapRequest = mapRequest
        _showMap = State(initialValue: kind == nil)
    }
    private var places: [Place] {
        let matches = store.places.filter { (kind == nil || $0.browseTypes.contains(kind!)) && $0.matches(search) && filters.matches($0, saved: store.isSaved($0)) }
        guard nearby, location.location != nil else { return matches }
        return matches.sorted {
            let first = location.distance(to: $0) ?? .greatestFiniteMagnitude
            let second = location.distance(to: $1) ?? .greatestFiniteMagnitude
            return first == second ? $0.name < $1.name : first < second
        }
    }
    private var visiblePlaces: [Place] { unmappedOnly ? places.filter { !$0.hasMapCoordinates } : places }
    private func returnToMap() {
        searchFocused = false
        unmappedOnly = false
        showMap = true
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    if unmappedOnly {
                        Button(action: returnToMap) { Label("Back to Map", systemImage: "chevron.left").font(.subheadline.weight(.semibold)).frame(minHeight: 44) }
                            .buttonStyle(.plain)
                    } else if let back {
                        Button(action: back) { Image(systemName: "chevron.left").frame(width: 32, height: 44) }
                            .buttonStyle(.plain).accessibilityLabel("Back to Browse")
                    }
                    if !unmappedOnly { Text(kind?.browseTitle ?? "Map").guideFont(17, .semibold).lineLimit(1) }
                    Spacer()
                    Button {
                        if nearby { nearby = false; location.cancel() } else { nearby = true; location.request() }
                    } label: {
                        Image(systemName: nearby ? "location.fill" : "location").frame(width: 44, height: 44)
                            .foregroundStyle(nearby ? GuidePalette.charcoal : palette.ink)
                            .background(nearby ? GuidePalette.yellow : .clear, in: Circle())
                    }.buttonStyle(.plain)
                        .accessibilityLabel(location.requesting ? "Locating, tap to stop" : "Near me")
                        .accessibilityAddTraits(nearby ? .isSelected : [])
                    Button {
                        if showMap { searchFocused = false; showMap = false } else { returnToMap() }
                    } label: {
                        Image(systemName: showMap ? (kind == nil ? "list.bullet" : "square.grid.2x2") : "map").frame(width: 44, height: 44)
                    }.buttonStyle(.plain).accessibilityLabel(showMap ? (kind == nil ? "Show list" : "Show gallery") : "Show map")
                    if kind == nil && !sidebarVisible {
                        Button { showSettings = true } label: { Image(systemName: "gearshape").frame(width: 36, height: 44) }
                            .buttonStyle(.plain).accessibilityLabel("Settings")
                    }
                }
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(palette.secondary)
                    TextField("Find a location", text: $search).textFieldStyle(.plain).guideFont(15).submitLabel(.search)
                        .focused($searchFocused).onSubmit { searchFocused = false }
                        .accessibilityLabel("Search \(kind?.browseTitle ?? "all locations")")
                    if !search.isEmpty {
                        Button { search = "" } label: { Image(systemName: "xmark.circle.fill") }
                            .buttonStyle(.plain).accessibilityLabel("Clear category search")
                    }
                }.padding(.horizontal, 12).frame(minHeight: 46)
                    .background(palette.surface, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(palette.line, lineWidth: 1))
                HStack {
                    Text(nearby && location.location != nil ? "\(visiblePlaces.count) \(visiblePlaces.count == 1 ? "location" : "locations") · Nearest first" : "\(visiblePlaces.count) \(visiblePlaces.count == 1 ? "location" : "locations")")
                        .guideFont(13).foregroundStyle(palette.secondary)
                    Spacer()
                    Button { searchFocused = false; showFilters = true } label: {
                        Label(filters.activeCount == 0 ? "Filters" : "Filters (\(filters.activeCount))", systemImage: "line.3.horizontal.decrease")
                            .font(.subheadline.weight(.semibold)).frame(minHeight: 36)
                    }.buttonStyle(.plain).accessibilityLabel("Filter locations")
                }
                if unmappedOnly {
                    Text("Locations without map pins").font(.headline)
                    Text("These listings do not have verified coordinates yet. Published addresses and other details are still available.")
                        .font(.caption).foregroundStyle(palette.secondary)
                }
                if filters.activeCount > 0 {
                    HStack {
                        Text([filters.type?.displayName, filters.status == .all ? nil : filters.status.rawValue,
                              filters.region.isEmpty ? nil : filters.region, filters.savedOnly ? "Saved" : nil].compactMap { $0 }.joined(separator: " · "))
                            .font(.caption).foregroundStyle(palette.secondary)
                        Spacer()
                        Button("Clear") { filters = PlaceFilter() }.font(.caption.weight(.semibold))
                    }
                }
                if let notice = store.catalogBanner { Text(notice).guideFont(13).foregroundStyle(palette.secondary) }
                if nearby, let message = location.message {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(message).guideFont(12).foregroundStyle(palette.secondary)
                        HStack {
                            Button("Try Again") { location.request() }.buttonStyle(.plain)
                            #if os(iOS)
                            if location.needsSettings, let url = URL(string: UIApplication.openSettingsURLString) {
                                Link("Open Settings", destination: url)
                            }
                            #endif
                        }.guideFont(12, .semibold)
                    }
                }
            }.padding(.horizontal, 16).padding(.top, 0).padding(.bottom, 10)
            if showMap {
                ZStack {
                    PlacesMap(places: places, open: open, userLocation: nearby ? location.location : nil)
                    if places.isEmpty {
                        ContentUnavailableView("No matching locations", systemImage: "mappin.slash", description: Text("Try another search or clear your filters."))
                            .background(.regularMaterial)
                    } else if !places.contains(where: \.hasMapCoordinates) {
                        ContentUnavailableView("No map pins available", systemImage: "mappin.slash", description: Text("Switch to the list to view these locations."))
                            .background(.regularMaterial)
                    }
                }
                if places.contains(where: { !$0.hasMapCoordinates }) {
                    Button { searchFocused = false; unmappedOnly = true; showMap = false } label: {
                        Text("\(places.filter { !$0.hasMapCoordinates }.count) without a map pin · View list")
                            .font(.caption).frame(maxWidth: .infinity, minHeight: 36)
                    }
                }
                MapKey().padding(.horizontal, 12).padding(.vertical, 10).background(palette.surface)
            } else {
                ScrollView {
                    if visiblePlaces.isEmpty {
                        Text("No locations match your search.").guideFont(15).foregroundStyle(palette.secondary)
                            .frame(maxWidth: .infinity).padding(24)
                    } else if kind == nil || unmappedOnly {
                        LazyVStack(spacing: 10) {
                            ForEach(visiblePlaces) { place in
                                Button { open(place) } label: {
                                    PlaceRow(place: place, distance: nearby ? location.distanceLabel(to: place) : nil)
                                        .padding(.horizontal, 14).background(palette.surface, in: RoundedRectangle(cornerRadius: 12))
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(palette.line))
                                }.buttonStyle(.plain)
                            }
                        }.padding(.horizontal, 16).padding(.bottom, 20)
                    } else {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: cardWidth), spacing: 7)], spacing: 7) {
                            ForEach(visiblePlaces) { place in
                                PlaceBrowseCard(place: place, title: place.guideName,
                                                distance: nearby ? location.distanceLabel(to: place) : nil,
                                                visited: !store.visits(to: place).isEmpty, open: { open(place) })
                            }
                        }.padding(.horizontal, 16).padding(.bottom, 22)
                    }
                }.scrollDismissesKeyboard(.immediately)
                    .refreshable { await store.refreshCatalog(force: true) }
            }
        }.onChange(of: mapRequest) { _, _ in returnToMap() }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .sheet(isPresented: $showFilters) { filterSheet }
    }
    private var filterSheet: some View {
        NavigationStack {
            Form {
                if kind == nil {
                    Picker("Category", selection: $filters.type) {
                        Text("All categories").tag(PlaceType?.none)
                        ForEach(PlaceType.allCases) { Text($0.displayName).tag(Optional($0)) }
                    }
                }
                Picker("Status", selection: $filters.status) {
                    ForEach(PlaceFilter.Status.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                Picker("State or province", selection: $filters.region) {
                    Text("All states and provinces").tag("")
                    ForEach(Array(Set(store.places.filter { kind == nil || $0.browseTypes.contains(kind!) }.map(\.region))).sorted(), id: \.self) {
                        Text($0).tag($0)
                    }
                }
                Toggle("Saved places only", isOn: $filters.savedOnly)
                Section {
                    Text("\(visiblePlaces.count) matching locations").foregroundStyle(.secondary)
                    Button("Reset Filters") { filters = PlaceFilter() }
                }
            }.navigationTitle("Filters")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showFilters = false } } }
        }
    }
}

struct PlaceRow: View {
    let place: Place
    var distance: String? = nil
    @EnvironmentObject private var store: SpotterStore
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            PlaceMapMarker(places: [place]).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) {
                Text(place.name).font(.headline).fixedSize(horizontal: false, vertical: true)
                Text(place.locality).font(.subheadline).foregroundStyle(.secondary)
                PlaceLabels(place: place)
                if let distance { Text(distance).font(.caption).foregroundStyle(.secondary) }
                if !store.visits(to: place).isEmpty { Label("Visited", systemImage: "checkmark.circle.fill").font(.caption).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 0)
            if let grade = place.reliability, place.status != "planned" { ReliabilityBadge(value: grade, compact: true) }
        }.padding(.vertical, 16).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
    }
}

private struct MapGroup: Identifiable {
    let places: [Place]
    var id: String { places[0].id }
    // Drawn at the cluster anchor so markers keep their spacing; tapping fits every member.
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: places[0].latitude!, longitude: places[0].longitude!)
    }
}

private func fittedRegion(_ places: [Place]) -> MKCoordinateRegion? {
    let mapped = places.filter(\.hasMapCoordinates)
    let lats = mapped.compactMap(\.latitude), lons = mapped.compactMap(\.longitude)
    guard let minLat = lats.min(), let maxLat = lats.max(), let minLon = lons.min(), let maxLon = lons.max() else { return nil }
    return MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2),
        span: MKCoordinateSpan(latitudeDelta: max((maxLat - minLat) * 1.4, 0.02), longitudeDelta: max((maxLon - minLon) * 1.4, 0.02)))
}

struct PlacesMap: View {
    let places: [Place]
    let open: (Place) -> Void
    var closeUp = false
    var userLocation: CLLocation? = nil
    @State private var position = MapCameraPosition.automatic
    @State private var latitudeSpan = 38.0
    @State private var longitudeSpan = 58.0
    @State private var selectedGroup: MapGroup?
    private var groups: [MapGroup] {
        if closeUp { return places.filter(\.hasMapCoordinates).map { MapGroup(places: [$0]) } }
        return PlaceClustering.clusters(places, latitudeSpan: latitudeSpan, longitudeSpan: longitudeSpan).map(MapGroup.init)
    }
    var body: some View {
        Map(position: $position) {
            if let userLocation {
                Annotation("Your approximate location", coordinate: userLocation.coordinate) {
                    Circle().fill(.blue).frame(width: 12, height: 12)
                        .overlay(Circle().stroke(.white, lineWidth: 2)).accessibilityLabel("Your location")
                }.annotationTitles(.hidden)
            }
            ForEach(groups) { group in
                Annotation(group.places.count == 1 ? group.places[0].guideName : "\(group.places.count) places", coordinate: group.coordinate) {
                    Button {
                        if group.places.count == 1 { open(group.places[0]) }
                        else if latitudeSpan < 0.005 || PlaceClustering.isColocated(group.places) {
                            selectedGroup = group
                        } else if let region = fittedRegion(group.places) {
                            withAnimation { position = .region(region) }
                        }
                    } label: {
                        PlaceMapMarker(places: group.places)
                            .frame(width: 44, height: 44).contentShape(Circle())
                    }.buttonStyle(.plain).accessibilityLabel(group.places.count == 1 ? "Open \(group.places[0].name)" : "Zoom into \(group.places.count) places")
                }.annotationTitles(.hidden)
            }
        }.mapStyle(.standard(elevation: .flat, emphasis: .muted, pointsOfInterest: .excludingAll))
            .onAppear { position = initialPosition }
            .onChange(of: userLocation) { _, _ in position = initialPosition }
            // Follow search results instead of resetting to the whole map on each keystroke.
            .onChange(of: places.map(\.id)) { _, _ in
                guard userLocation == nil, !closeUp, !places.isEmpty else { return }
                withAnimation { position = initialPosition }
            }
            .onMapCameraChange(frequency: .onEnd) { context in
                latitudeSpan = context.region.span.latitudeDelta
                longitudeSpan = context.region.span.longitudeDelta
            }
            .sheet(item: $selectedGroup) { group in
                VStack(alignment: .leading, spacing: 16) {
                    SheetHeader(title: "Places here", close: { selectedGroup = nil })
                    ScrollView {
                        ForEach(group.places) { place in
                            Button { selectedGroup = nil; open(place) } label: { PlaceRow(place: place) }.buttonStyle(.plain)
                        }
                    }
                }.padding(24)
                #if os(macOS)
                .frame(width: 400, height: 480)
                #endif
            }
    }
    private var initialPosition: MapCameraPosition {
        if let userLocation {
            return .region(MKCoordinateRegion(center: userLocation.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.45, longitudeDelta: 0.45)))
        }
        if closeUp, let place = places.first, place.hasMapCoordinates {
            return .region(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: place.latitude!, longitude: place.longitude!),
                span: MKCoordinateSpan(latitudeDelta: place.hasPreciseCoordinates ? 0.015 : 0.25, longitudeDelta: place.hasPreciseCoordinates ? 0.015 : 0.25)))
        }
        // Narrowed results fit to their pins; a continent-wide set keeps the familiar overview.
        if let region = fittedRegion(places), region.span.latitudeDelta < 30, region.span.longitudeDelta < 50 {
            return .region(region)
        }
        return .region(MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 40, longitude: -100),
            span: MKCoordinateSpan(latitudeDelta: 38, longitudeDelta: 58)))
    }
}

struct PlaceDetail: View {
    let place: Place
    let back: () -> Void
    let open: (Place) -> Void
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var showCheckIn = false
    @State private var selectedVisit: Visit?
    @State private var actionError: String?
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(action: back) { Image(systemName: "chevron.left").frame(width: 44, height: 44) }
                    .buttonStyle(.plain).accessibilityLabel("Back")
                Spacer()
                Text("Location Details").guideFont(17, .semibold).foregroundStyle(palette.ink)
                    .lineLimit(1).minimumScaleFactor(0.6)
                Spacer()
                Button {
                    if !store.perform({ try $0.toggleSaved(place) }) { actionError = store.takeError() }
                } label: {
                    Image(systemName: store.isSaved(place) ? "bookmark.fill" : "bookmark").font(.system(size: 20))
                        .frame(width: 44, height: 44)
                }.buttonStyle(.plain).disabled(!store.ready)
                    .accessibilityLabel(store.isSaved(place) ? "Remove from Saved" : "Save location")
            }.foregroundStyle(palette.accent).padding(.horizontal, 6)
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    PlaceLabels(place: place)
                    HStack(alignment: .top, spacing: 16) {
                        Text(place.name).guideFont(28, .bold).fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                        if let grade = place.reliability, place.status != "planned" { ReliabilityBadge(value: grade) }
                    }.padding(.top, 6)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(place.address ?? "Street address not published")
                        Text("\(place.city), \(place.region)\(place.postalCode.map { " " + $0 } ?? "") · \(place.country == "US" ? "United States" : place.country == "CA" ? "Canada" : place.country)")
                    }.font(.subheadline).foregroundStyle(palette.secondary).textSelection(.enabled)
                    if let checked = place.checkedOn {
                        Text("Updated from Rivian · \(checked)").font(.caption).foregroundStyle(palette.secondary).padding(.top, 4)
                    }
                    TagFlow(spacing: 10) {
                        if let url = place.directionsURL {
                            Link(destination: url) { Label("Directions", systemImage: "arrow.up.right").detailAction(primary: true) }
                        }
                        if let url = place.safeBookingURL { DemoBookingButton(url: url) }
                        if let url = place.phoneURL {
                            Link(destination: url) { Label("Call", systemImage: "phone").detailAction() }
                        }
                        Button { showCheckIn = true } label: {
                            Label(store.visits(to: place).isEmpty ? "Add Visit" : "Visited", systemImage: "checkmark.seal").detailAction()
                        }.buttonStyle(.plain).disabled(!store.ready)
                    }.padding(.vertical, 8)
                    PlaceDetailPhoto(place: place)
                    if place.hasMapCoordinates {
                        PlacesMap(places: [place], open: { _ in }, closeUp: true)
                            .frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 10))
                        if !place.hasPreciseCoordinates {
                            Text("Approximate area · exact address not published").font(.caption).foregroundStyle(palette.secondary)
                        }
                    }
                    if place.hours != nil || place.serviceHours != nil {
                        DetailPanel(title: "Hours", symbol: "clock.fill", color: .blue) {
                            if let hours = place.hours { DetailFact(title: "Visiting hours", value: hours) }
                            if let hours = place.serviceHours { DetailFact(title: "Service hours", value: hours) }
                        }
                    }
                    ForEach(Array((place.information ?? []).enumerated()), id: \.offset) { _, section in
                        if section.expandable {
                            DisclosureGroup {
                                informationFacts(section).padding(.top, 12)
                            } label: { Label(section.title, systemImage: section.title.contains("charger") ? "ev.charger" : "clock").guideFont(15, .semibold) }
                                .padding(14).background(palette.surface, in: RoundedRectangle(cornerRadius: 14))
                        } else {
                            DetailPanel(title: section.title, symbol: sectionSymbol(section.title), color: palette.accent, reliability: (place.information ?? []).filter { $0.metrics != nil }.count > 1 ? section.reliability : nil) {
                                informationFacts(section)
                            }
                        }
                    }
                    let related = (place.relatedPlaceIDs ?? []).compactMap { id in store.places.first { $0.id == id || $0.aliases.contains(id) } }
                    if !related.isEmpty {
                        DetailPanel(title: "Nearby", symbol: "mappin.and.ellipse", color: .green) {
                            ForEach(related) { nearby in
                                Button { open(nearby) } label: {
                                    HStack { Text(nearby.guideName).guideFont(15); Spacer(); Image(systemName: "chevron.right").font(.caption) }
                                        .frame(minHeight: 38).contentShape(Rectangle())
                                }.buttonStyle(.plain)
                            }
                        }
                    }
                    DetailPanel(title: "Visits", symbol: "checkmark.seal.fill", color: palette.accent) {
                        if store.visits(to: place).isEmpty {
                            Text("No visits recorded").guideFont(14).foregroundStyle(palette.secondary)
                        } else {
                            ForEach(store.visits(to: place)) { visit in
                                Button { selectedVisit = visit } label: { VisitRow(visit: visit) }.buttonStyle(.plain)
                            }
                        }
                        Button { showCheckIn = true } label: { Label("Add Visit", systemImage: "plus").guideFont(14, .medium).frame(minHeight: 36) }
                            .buttonStyle(.plain).disabled(!store.ready)
                    }

                }.padding(.horizontal, 16).padding(.top, 12).padding(.bottom, 24)
                    .frame(maxWidth: 660).frame(maxWidth: .infinity)
            }
        }
        .sheet(isPresented: $showCheckIn) { CheckInView(place: place) }
        .sheet(item: $selectedVisit) { VisitEditor(visit: $0) }
        .actionError($actionError)
    }
    private func sectionSymbol(_ title: String) -> String {
        if title.contains("pricing") { return "dollarsign.circle.fill" }
        if title == "Site features" { return "sparkles" }
        if title.contains("Network") || title == "Waypoints" { return "bolt.fill" }
        return "info.circle.fill"
    }
    private func informationFacts(_ section: PlaceInformation) -> some View {
        let pricing = section.title.hasSuffix(" pricing")
        let metrics = section.metrics ?? (pricing ? Array(section.facts.prefix(2)) : nil)
        let facts = section.facts.filter { fact in
            if pricing && (metrics ?? []).contains(fact) { return false }
            if section.reliability != nil && fact.title == "Published reliability grade" { return false }
            if section.metrics != nil && ["Chargers", "Maximum rated power", "Vehicle access"].contains(fact.title) { return false }
            if !(section.tags ?? []).isEmpty && ["Amenities", "At this location"].contains(fact.title) { return false }
            return true
        }
        return VStack(alignment: .leading, spacing: 16) {
            if let metrics {
                HStack(alignment: .top, spacing: 20) {
                    ForEach(Array(metrics.enumerated()), id: \.offset) { _, metric in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(metric.value).font(.title.bold()).fixedSize(horizontal: false, vertical: true)
                            Text(metric.title).font(.caption).foregroundStyle(palette.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                            .padding(pricing ? 12 : 0)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(pricing ? palette.line : .clear))
                    }
                }.padding(.vertical, 6)
            }
            if let tags = section.tags, !tags.isEmpty { WebsiteTags(values: tags) }
            if section.metrics != nil {
                Text("Station details, not live charger availability. Check connector compatibility and host access rules before visiting.")
                    .font(.caption).foregroundStyle(palette.secondary)
            }
            ForEach(Array(facts.enumerated()), id: \.offset) { _, fact in
                if fact.title == "Connectors" { WebsiteTags(values: [fact.value]) }
                else { DetailFact(title: fact.title, value: fact.value) }
            }
        }.textSelection(.enabled)
    }

}

private struct DetailPanel<Content: View>: View {
    let title: String
    let symbol: String
    let color: Color
    var reliability: PlaceReliability? = nil
    @ViewBuilder let content: () -> Content
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                Text(title).font(.headline).fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 4)
                if let reliability { ReliabilityBadge(value: reliability, compact: true) }
            }
            content()
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
            .background(GuidePalette(scheme: scheme).surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(GuidePalette(scheme: scheme).line, lineWidth: 0.5))
    }
}

private struct DetailFact: View {
    let title: String
    let value: String
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).guideFont(13).foregroundStyle(GuidePalette(scheme: scheme).secondary)
            Text(value).guideFont(14).lineSpacing(3)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SavedView: View {
    let open: (Place) -> Void
    let explore: () -> Void
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                GuideHeader(title: "Saved", subtitle: "Your saved places, ready when you are.")
                if let notice = store.catalogBanner { Text(notice).guideFont(13).foregroundStyle(.secondary) }
                if store.journal.savedPlaces.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Rectangle().fill(GuidePalette(scheme: scheme).line).frame(height: 1)
                        Text("No saved places yet").guideFont(22, .bold).padding(.top, 20)
                        Text("Tap the bookmark on any place to save it here.")
                            .guideFont(16).foregroundStyle(GuidePalette(scheme: scheme).secondary).lineSpacing(4)
                        Button("Explore Places", action: explore).buttonStyle(PrimaryAction()).padding(.top, 12)
                    }
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(store.journal.savedPlaces) { saved in
                            let place = store.currentPlace(saved)
                            Button { open(place) } label: { PlaceRow(place: place) }.buttonStyle(.plain)
                            Divider()
                        }
                    }
                }
            }.padding(24)
        }.refreshable { await store.refreshCatalog(force: true) }
    }
}

struct JournalView: View {
    let explore: () -> Void
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var selectedVisit: Visit?
    @EnvironmentObject private var sync: CloudSyncStatus
    @State private var showDetails = false
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                GuideHeader(title: "Visited", subtitle: "Your check-ins and private notes.")
                if let notice = store.storageNotice {
                    Label(notice, systemImage: "exclamationmark.triangle")
                        .guideFont(13).foregroundStyle(palette.secondary).lineSpacing(3)
                }
                if store.visits.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Rectangle().fill(palette.line).frame(height: 1)
                        Text("No visits recorded").guideFont(22, .bold).padding(.top, 20)
                        Text("Find a place and check in. You can add past visits and notes, too.")
                            .guideFont(16).foregroundStyle(palette.secondary).lineSpacing(4)
                        Button("Find a Place", action: explore).buttonStyle(PrimaryAction()).padding(.top, 12)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.seal")
                        Text("\(store.visits.count) \(store.visits.count == 1 ? "visit" : "visits") to \(store.journal.uniquePlaceCount) \(store.journal.uniquePlaceCount == 1 ? "place" : "places")")
                            .guideFont(15, .medium)
                    }.foregroundStyle(palette.accent)
                    VStack(spacing: 0) {
                        ForEach(store.visits) { visit in
                            Button { selectedVisit = visit } label: { VisitRow(visit: visit) }.buttonStyle(.plain)
                            Rectangle().fill(palette.line).frame(height: 0.5)
                        }
                    }
                    DisclosureGroup("Places by kind") {
                        VStack(spacing: 14) {
                            ForEach(PlaceType.allCases) { type in
                                HStack {
                                    Label(type.rawValue, systemImage: type.symbol)
                                    Spacer()
                                    Text(String(store.journal.count(for: type)))
                                }.guideFont(15)
                            }
                        }.padding(.top, 16)
                    }.guideFont(15)
                }
                VStack(alignment: .leading, spacing: 12) {
                    Button { showDetails.toggle() } label: {
                        Label(sync.title, systemImage: "icloud").guideFont(13)
                    }.buttonStyle(.plain).foregroundStyle(palette.secondary)
                    if showDetails {
                        Text(sync.detail)
                            .guideFont(13).foregroundStyle(palette.secondary).lineSpacing(4)
                    }
                    if !store.visits.isEmpty || !store.journal.savedPlaces.isEmpty { ExportJournalButton() }
                }.padding(.top, 8)
            }.padding(24)
        }
        .sheet(item: $selectedVisit) { VisitEditor(visit: $0) }
    }
}

/// Saves the private journal (visits, notes, saved places) as a JSON backup.
private struct ExportJournalButton: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var showExport = false
    @State private var document = JournalDocument(data: Data())
    var body: some View {
        Button {
            if let data = store.export() { document = JournalDocument(data: data); showExport = true }
        } label: { Label("Export My Journal", systemImage: "square.and.arrow.up").guideFont(15, .semibold) }
            .buttonStyle(.plain).foregroundStyle(GuidePalette(scheme: scheme).accent)
            .frame(minHeight: 44).disabled(!store.ready)
            .fileExporter(isPresented: $showExport, document: document, contentType: .json,
                          defaultFilename: "RivianSpotter-Journal") { result in
                if case .failure(let error) = result { store.error = error.localizedDescription }
            }
    }
}

struct VisitRow: View {
    let visit: Visit
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(alignment: .top, spacing: 18) {
            VStack(spacing: 3) {
                Text(visit.visitedAt, format: .dateTime.month(.abbreviated)).textCase(.uppercase)
                    .guideFont(10, .bold).tracking(1)
                Text(visit.visitedAt, format: .dateTime.day()).guideFont(26, .medium)
                Text(visit.visitedAt, format: .dateTime.year()).guideFont(10)
            }.foregroundStyle(GuidePalette(scheme: scheme).secondary).frame(minWidth: 40)
            VStack(alignment: .leading, spacing: 7) {
                Text(visit.place.guideTitle).guideFont(17, .semibold)
                Text("\(visit.type.rawValue) · \(visit.place.city), \(visit.place.region)")
                    .guideFont(13).foregroundStyle(GuidePalette(scheme: scheme).accent)
                if !visit.note.isEmpty {
                    Text(visit.note).guideFont(15).foregroundStyle(GuidePalette(scheme: scheme).secondary).lineLimit(3).lineSpacing(3)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.caption2).foregroundStyle(GuidePalette(scheme: scheme).secondary)
        }.padding(.vertical, 20).frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
    }
}

private struct SheetHeader: View {
    let title: String
    let close: () -> Void
    var body: some View {
        HStack {
            Text(title).guideFont(17, .semibold)
            Spacer()
            Button(action: close) {
                Image(systemName: "xmark").font(.system(size: 14, weight: .semibold)).frame(width: 44, height: 44)
            }.buttonStyle(.plain).accessibilityLabel("Close")
        }
    }
}

private struct VisitFields: View {
    let place: Place
    @Binding var date: Date
    @Binding var note: String
    @Binding var type: PlaceType
    var allowTypeChange = true
    @Environment(\.colorScheme) private var scheme
    @FocusState private var noteFocused: Bool
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Label(place.typeLabel, systemImage: place.types.first?.symbol ?? "mappin").guideFont(15).foregroundStyle(palette.accent)
                Text(place.guideTitle).guideFont(28, .bold).tracking(-0.5)
                Text(place.locality).guideFont(15).foregroundStyle(palette.secondary)
            }
            if place.status == "planned" || !place.listed {
                Text("Listed as \(place.statusLabel.lowercased()). Record a visit you actually made; this won’t change its published status.")
                    .guideFont(13).foregroundStyle(palette.secondary)
            }
            VStack(spacing: 18) {
                DatePicker("Visit date", selection: $date, in: ...Date(), displayedComponents: .date)
                if place.types.count > 1 && allowTypeChange {
                    Picker("Visited as", selection: $type) {
                        ForEach(place.types) { Text($0.rawValue).tag($0) }
                    }
                }
            }.guideFont(15).frame(maxWidth: .infinity).padding(18).background(palette.surface, in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Notes").guideFont(15, .semibold)
                    Spacer()
                    // Return adds a line in a multi-line note, so give the keyboard an explicit exit.
                    if noteFocused {
                        Button("Done") { noteFocused = false }.guideFont(15, .semibold).buttonStyle(.plain)
                            .foregroundStyle(palette.accent).frame(minHeight: 44)
                    } else {
                        Text("Optional").guideFont(13).foregroundStyle(palette.secondary)
                    }
                }.frame(minHeight: 44)
                TextField("Add a private note", text: $note, axis: .vertical).textFieldStyle(.plain).focused($noteFocused)
                    .guideFont(17).lineLimit(5...8).padding(18)
                    .background(palette.surface, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(palette.line, lineWidth: 1))
                if note.count > 3500 {
                    Text("\(note.count) / 4,000").guideFont(13).foregroundStyle(note.count > 4000 ? .red : palette.secondary)
                }
            }
        }
    }
}

struct CheckInView: View {
    let place: Place
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var date = Date()
    @State private var note = ""
    @State private var type: PlaceType
    @State private var saved = false
    @State private var actionError: String?
    init(place: Place) { self.place = place; _type = State(initialValue: place.types.first ?? .space) }
    var body: some View {
        VStack(spacing: 0) {
            SheetHeader(title: saved ? "Visit Saved" : "Check In", close: { dismiss() }).padding(.horizontal, 24).padding(.top, 12)
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    if saved {
                        VStack(spacing: 22) {
                            Image(systemName: "checkmark.seal").font(.system(size: 64, weight: .ultraLight))
                                .foregroundStyle(GuidePalette(scheme: scheme).accent).padding(.top, 48)
                            Text("Visit saved").guideFont(34, .bold).tracking(-1)
                            Text(place.guideTitle).guideFont(17, .semibold).multilineTextAlignment(.center)
                            Text(date, format: .dateTime.month(.wide).day().year()).guideFont(15)
                            Text("Added to Visited.").guideFont(15).foregroundStyle(GuidePalette(scheme: scheme).secondary)
                            Button("Done") { dismiss() }.buttonStyle(PrimaryAction()).padding(.top, 24)
                        }.frame(maxWidth: .infinity)
                    } else {
                        VisitFields(place: place, date: $date, note: $note, type: $type)
                        Button {
                            saved = store.perform { _ = try $0.checkIn(at: place, type: type, date: date, note: note) }
                            if !saved { actionError = store.takeError() }
                        } label: { Label("Save Visit", systemImage: "checkmark") }
                            .buttonStyle(PrimaryAction()).disabled(note.count > 4000 || !store.ready)
                        Label("Visits and notes are private.", systemImage: "lock")
                            .guideFont(13).foregroundStyle(GuidePalette(scheme: scheme).secondary)
                    }
                }.padding(24)
            }.scrollDismissesKeyboard(.interactively)
        }.background(GuidePalette(scheme: scheme).paper).foregroundStyle(GuidePalette(scheme: scheme).ink)
            .tint(GuidePalette(scheme: scheme).accent).actionError($actionError)
        #if os(macOS)
            .frame(width: 420, height: 640)
        #endif
    }
}

struct VisitEditor: View {
    let visit: Visit
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var date: Date
    @State private var note: String
    @State private var type: PlaceType
    @State private var confirmDelete = false
    @State private var actionError: String?
    init(visit: Visit) {
        self.visit = visit
        _date = State(initialValue: visit.visitedAt); _note = State(initialValue: visit.note); _type = State(initialValue: visit.type)
    }
    var body: some View {
        VStack(spacing: 0) {
            SheetHeader(title: "Your Visit", close: { dismiss() }).padding(.horizontal, 24).padding(.top, 12)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VisitFields(place: visit.place, date: $date, note: $note, type: $type, allowTypeChange: false)
                    Button("Save Changes") {
                        if store.perform({ try $0.update(visit, date: date, note: note) }) { dismiss() }
                        else { actionError = store.takeError() }
                    }.buttonStyle(PrimaryAction()).disabled(note.count > 4000)
                    ShareLink(item: receipt) { Label("Share This Visit", systemImage: "square.and.arrow.up").guideFont(15, .semibold) }
                        .buttonStyle(.plain).foregroundStyle(GuidePalette(scheme: scheme).accent)
                    Text("Shares the place and date. Your note stays private.").guideFont(13).foregroundStyle(GuidePalette(scheme: scheme).secondary)
                    // The sheet's ink foreground would otherwise override the destructive role's red.
                    Button("Delete Visit", role: .destructive) { confirmDelete = true }
                        .buttonStyle(.plain).guideFont(15, .semibold).foregroundStyle(.red).padding(.vertical, 12)
                }.padding(24)
            }.scrollDismissesKeyboard(.interactively)
        }.background(GuidePalette(scheme: scheme).paper).foregroundStyle(GuidePalette(scheme: scheme).ink)
            .tint(GuidePalette(scheme: scheme).accent)
            .confirmationDialog("Delete this visit?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete Visit", role: .destructive) {
                    if store.perform({ try $0.delete(visit) }) { dismiss() }
                    else { actionError = store.takeError() }
                }
            } message: { Text("This removes the visit and its note from your journal.") }
            .actionError($actionError)
        #if os(macOS)
            .frame(width: 420, height: 680)
        #endif
    }
    private var receipt: String {
        "I visited \(visit.place.name) · \(visit.type.rawValue)\n\(visit.visitedAt.formatted(date: .long, time: .omitted))\n\(visit.place.websiteURL?.absoluteString ?? "https://rivianspotter.com")"
    }
}

struct JournalDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data) { self.data = data }
    init(configuration: ReadConfiguration) throws { data = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: data) }
}

private extension View {
    func actionError(_ message: Binding<String?>) -> some View {
        alert("Couldn’t save your change", isPresented: Binding(
            get: { message.wrappedValue != nil },
            set: { if !$0 { message.wrappedValue = nil } })) {
                Button("OK") { message.wrappedValue = nil }
            } message: { Text(message.wrappedValue ?? "") }
    }
}

private struct GuideFont: ViewModifier {
    @ScaledMetric private var size: CGFloat
    let weight: Font.Weight
    init(_ size: CGFloat, _ weight: Font.Weight) {
        _size = ScaledMetric(wrappedValue: size, relativeTo: .body)
        self.weight = weight
    }
    func body(content: Content) -> some View { content.font(.system(size: size, weight: weight)) }
}
extension View {
    func guideFont(_ size: CGFloat, _ weight: Font.Weight = .regular) -> some View {
        modifier(GuideFont(size, weight))
    }
    /// Fixed-size controls like the tab bar show an enlarged copy on long press at accessibility sizes.
    @ViewBuilder func largeContentViewerIfAvailable() -> some View {
        #if os(iOS)
        accessibilityShowsLargeContentViewer()
        #else
        self
        #endif
    }
    /// Screens use custom navigation, so restore the system's swipe from the leading edge to go back.
    func edgeSwipeBack(_ back: (() -> Void)?) -> some View {
        simultaneousGesture(DragGesture(minimumDistance: 20, coordinateSpace: .local).onEnded { value in
            guard let back, value.startLocation.x < 28, value.translation.width > 80,
                  abs(value.translation.height) < value.translation.width / 2 else { return }
            back()
        })
    }
}
