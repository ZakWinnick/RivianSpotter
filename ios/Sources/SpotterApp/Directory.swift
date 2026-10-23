import SwiftUI
#if SWIFT_PACKAGE
import SpotterCore
#endif

/// Each collection the iPad sidebar and the iPhone Browse tab can open, following Facades.
enum Destination: Hashable {
    case all, lists, visited, saved, receipts, regions, data, map, glossary
    case region(String), type(PlaceType), feature(String), status(PlaceStatusGroup)
}

enum Route: Hashable {
    case place(String)
    case destination(Destination)
}

private struct NavigateKey: EnvironmentKey { static let defaultValue: (Route) -> Void = { _ in } }
extension EnvironmentValues {
    /// Pushes onto the current navigation stack, for places opened outside a NavigationLink
    /// (map pins, sheets).
    var navigate: (Route) -> Void {
        get { self[NavigateKey.self] }
        set { self[NavigateKey.self] = newValue }
    }
}

extension View {
    func routeDestinations() -> some View {
        navigationDestination(for: Route.self) { route in
            switch route {
            case .place(let id): PlaceDetail(placeID: id)
            case .destination(let destination): DestinationView(destination: destination)
            }
        }
    }
}

// MARK: - Root

struct RootView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @Environment(\.scenePhase) private var scenePhase
    @State private var selection: Destination? = .all
    @State private var widePath = NavigationPath()
    @State private var tab = Tab.locations
    @State private var paths: [Tab: NavigationPath] = [:]
    @State private var showSettings = false
    @State private var showBaseCampPicker = false
    @State private var mapRequest = 0
    enum Tab: Hashable { case locations, map, lists, browse }
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        GeometryReader { geometry in
            Group {
                if geometry.size.width >= 700 { wide } else { compact }
            }.environment(\.sidebarVisible, geometry.size.width >= 700)
        }
        .background(palette.paper).tint(palette.accent)
        .sheet(isPresented: $showSettings) { SettingsView().spotterEnvironment(store) }
        .sheet(isPresented: $showBaseCampPicker) { BaseCampPicker().spotterEnvironment(store) }
        .task { await store.refreshCatalog() }
        #if DEBUG
        .onAppear(perform: openScreenshotRoute)
        #endif
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

    #if DEBUG
    /// App Store screenshots: `-ScreenshotTab lists|map|browse` selects a tab or sidebar item, and
    /// `-ScreenshotOpen place:<id>|data|receipts|regions|glossary` pushes a screen. Debug builds only.
    private func openScreenshotRoute() {
        let defaults = UserDefaults.standard
        switch defaults.string(forKey: "ScreenshotTab") {
        case "lists": tab = .lists; selection = .lists
        case "map": tab = .map; selection = .map
        case "browse": tab = .browse
        default: break
        }
        guard let open = defaults.string(forKey: "ScreenshotOpen") else { return }
        let route: Route
        switch open {
        case "data": route = .destination(.data)
        case "receipts": route = .destination(.receipts)
        case "regions": route = .destination(.regions)
        case "glossary": route = .destination(.glossary)
        default: route = .place(String(open.dropFirst("place:".count)))
        }
        widePath.append(route)
        paths[tab, default: NavigationPath()].append(route)
    }
    #endif

    private var wide: some View {
        NavigationSplitView {
            List(selection: $selection) {
                DirectoryRows(wide: true, settings: { showSettings = true }, baseCamp: { openBaseCamp(wide: true) })
            }.listStyle(.sidebar)
                .navigationTitle("RivianSpotter")
                .brandHeader(showsName: true)
                .navigationSplitViewColumnWidth(min: 230, ideal: 260)
        } detail: {
            NavigationStack(path: $widePath) {
                DestinationView(destination: selection ?? .all, mapRequest: mapRequest).routeDestinations()
            }.environment(\.navigate) { widePath.append($0) }
        }
        .onChange(of: selection) { _, value in
            widePath = NavigationPath()
            if value == .map { mapRequest += 1 }
        }
    }

    private var compact: some View {
        TabView(selection: Binding(get: { tab }, set: { next in
            // Choosing the current tab again returns to its first screen, as in system apps.
            if next == tab { paths[next] = NavigationPath(); if next == .map { mapRequest += 1 } }
            tab = next
        })) {
            stack(.locations) { DestinationView(destination: .all) }
                .tabItem { Label("Locations", systemImage: "square.grid.2x2") }.tag(Tab.locations)
            stack(.map) { DestinationView(destination: .map, mapRequest: mapRequest) }
                .tabItem { Label("Map", systemImage: "map") }.tag(Tab.map)
            stack(.lists) { DestinationView(destination: .lists) }
                .tabItem { Label("Lists", systemImage: "list.bullet.rectangle.portrait") }.tag(Tab.lists)
            stack(.browse) {
                List { DirectoryRows(wide: false, settings: { showSettings = true }, baseCamp: { openBaseCamp(wide: false) }) }
                    .navigationTitle("Browse")
            }.tabItem { Label("Browse", systemImage: "square.stack") }.tag(Tab.browse)
        }
    }

    private func stack<Content: View>(_ tab: Tab, @ViewBuilder _ content: () -> Content) -> some View {
        let path = Binding(get: { paths[tab] ?? NavigationPath() }, set: { paths[tab] = $0 })
        return NavigationStack(path: path) { content().brandHeader(showsName: false).routeDestinations() }
            .environment(\.navigate) { route in paths[tab, default: NavigationPath()].append(route) }
    }

    private func openBaseCamp(wide: Bool) {
        guard let place = store.baseCamp else { showBaseCampPicker = true; return }
        if wide { widePath.append(Route.place(place.id)) }
        else { paths[.browse, default: NavigationPath()].append(Route.place(place.id)) }
    }
}

/// Facades' sidebar: collections, Browse, Location Type, Site Feature, Status, then Base Camp,
/// Glossary, and Settings. The iPhone Browse tab shows the same rows.
private struct DirectoryRows: View {
    let wide: Bool
    let settings: () -> Void
    let baseCamp: () -> Void
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let places = store.places
        if wide {
            Section("\(places.count) Locations") {
                row(.all, "All Locations", "square.grid.2x2")
                row(.lists, "Lists", "list.bullet.rectangle.portrait")
                row(.visited, "Visited", "checkmark.seal", count: store.visitedPlaces.count)
                row(.saved, "Saved", "bookmark", count: store.journal.savedPlaces.count)
            }
        }
        Section("Browse") {
            row(.regions, "States & Provinces", "flag")
            row(.data, "Location Data", "chart.bar")
            if wide { row(.map, "Map", "map") }
            row(.glossary, "Glossary", "book")
        }
        Section("Location Type") {
            ForEach(PlaceType.allCases) { type in
                row(.type(type), type.browseTitle, type.symbol, color: type.browseColor(in: scheme),
                    count: places.filter { $0.browseTypes.contains(type) }.count)
            }
        }
        Section("Status") {
            // Current listings are the whole directory, so only the exceptions get a row.
            ForEach(PlaceStatusGroup.allCases.filter { $0 != .listed }) { status in
                let count = places.filter { $0.statusGroup == status }.count
                if count > 0 { row(.status(status), status.rawValue, status.symbol, count: count) }
            }
        }
        Section {
            Button(action: baseCamp) {
                // The chosen place goes on its own line under "Base Camp", in full, so neither wraps
                // into the other in a narrow sidebar.
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Base Camp").lineLimit(1)
                        if let place = store.baseCamp {
                            Text(place.guideName).font(.footnote).foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                } icon: { Image(systemName: "tent") }
            }.foregroundStyle(.primary)
            Button(action: settings) { Label("Settings", systemImage: "gearshape") }.foregroundStyle(.primary)
        } footer: {
            if !wide, let notice = store.catalogBanner { Text(notice) }
        }
    }
    @ViewBuilder private func row(_ destination: Destination, _ title: String, _ symbol: String,
                                  color: Color? = nil, count: Int? = nil) -> some View {
        let label = HStack {
            Label { Text(title).lineLimit(2) } icon: { Image(systemName: symbol).foregroundStyle(color ?? .accentColor) }
            Spacer()
            if let count, count > 0, !wide { Text("\(count)").font(.subheadline).foregroundStyle(.secondary) }
        }
        if wide { NavigationLink(value: destination) { label } }
        else { NavigationLink(value: Route.destination(destination)) { label } }
    }
}

extension PlaceStatusGroup {
    var symbol: String {
        switch self {
        case .listed: "checkmark.circle"
        case .comingSoon: "sparkles"
        case .temporarilyClosed: "pause.circle"
        case .closed: "xmark.circle"
        case .unlisted: "archivebox"
        }
    }
}

/// The screen for one destination, shared by the sidebar's detail column and the tab stacks.
struct DestinationView: View {
    let destination: Destination
    var mapRequest = 0
    @Environment(\.navigate) private var navigate
    var body: some View {
        switch destination {
        case .lists: ListsView()
        case .receipts: ReceiptsView()
        case .regions: RegionsView()
        case .data: LocationDataView()
        case .glossary: GlossaryView()
        case .map:
            CategoryBrowseView(kind: nil, open: { navigate(.place($0.id)) }, back: nil, mapRequest: mapRequest)
                .navigationTitle("Map").hiddenNavigationBar()
        default: GalleryView(destination: destination)
        }
    }
}

/// The RivianSpotter route mark from the app icon. The desktop preview has no asset catalog,
/// so it shows nothing there.
struct BrandMark: View {
    var size: CGFloat = 28
    var body: some View {
        #if os(iOS)
        if let image = UIImage(named: "BrandMark") {
            Image(uiImage: image).resizable().scaledToFit()
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
                .accessibilityHidden(true)
        }
        #endif
    }
}

extension View {
    /// Adds the brand mark: beside the app name at the top of the iPad and Mac sidebar, and on its
    /// own in the top-left corner of each iPhone tab's first screen.
    func brandHeader(showsName: Bool) -> some View {
        #if os(iOS)
        toolbar {
            if showsName {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) { BrandMark(size: 26); Text("RivianSpotter").font(.headline) }
                        .accessibilityElement(children: .combine).accessibilityLabel("RivianSpotter")
                }
            } else {
                ToolbarItem(placement: .topBarLeading) { BrandMark().accessibilityLabel("RivianSpotter") }
            }
        }
        #else
        self
        #endif
    }
    func hiddenNavigationBar() -> some View {
        #if os(iOS)
        toolbar(.hidden, for: .navigationBar)
        #else
        self
        #endif
    }
}

// MARK: - Gallery

enum GalleryLayout: String, CaseIterable {
    case grid = "Grid", thumbnails = "Thumbnails", list = "List"
    var symbol: String {
        switch self { case .grid: "square.grid.2x2"; case .thumbnails: "photo"; case .list: "list.bullet" }
    }
}

enum GallerySort: String, CaseIterable {
    case name = "Name", region = "State", nearest = "Nearest", recent = "Recently Visited"
}

/// Narrows a gallery like Facades' Filter sheet. Empty sets mean "any".
struct GalleryFilter: Equatable {
    var types: Set<PlaceType> = []
    var features: Set<String> = []
    var statuses: Set<PlaceStatusGroup> = []
    var regions: Set<String> = []
    var count: Int { types.count + features.count + statuses.count + regions.count }
    func matches(_ place: Place) -> Bool {
        (types.isEmpty || !types.isDisjoint(with: place.browseTypes))
            && (features.isEmpty || !features.isDisjoint(with: place.siteFeatures))
            && (statuses.isEmpty || statuses.contains(place.statusGroup))
            && (regions.isEmpty || regions.contains(place.region))
    }
}

/// Facades' "All Stores": centered title, a "…" view-options menu, search, and a photo grid,
/// thumbnail column, or list. Type, feature, and status pages add a "This (n) | Other (n)" switch.
struct GalleryView: View {
    let destination: Destination
    @EnvironmentObject private var store: SpotterStore
    @EnvironmentObject private var location: LocationService
    @Environment(\.colorScheme) private var scheme
    @AppStorage("galleryLayout") private var layout = GalleryLayout.grid.rawValue
    @AppStorage private var storedSort: String
    @State private var search = ""
    @State private var filter = GalleryFilter()
    @State private var showFilter = false
    @State private var showOther = false
    @State private var width: CGFloat = 400
    @Environment(\.dynamicTypeSize) private var typeSize
    private var palette: GuidePalette { .init(scheme: scheme) }
    init(destination: Destination) {
        self.destination = destination
        // Visited remembers its own order and starts with the most recent visit.
        let visited = destination == .visited
        _storedSort = AppStorage(wrappedValue: visited ? GallerySort.recent.rawValue : GallerySort.name.rawValue,
                                 visited ? "visitedSort" : "gallerySort")
    }

    private var title: String {
        switch destination {
        case .all: "All Locations"
        case .visited: "Visited"
        case .saved: "Saved"
        case .type(let type): type.browseTitle
        case .feature(let feature): feature
        case .status(let status): status.rawValue
        case .region(let code): RegionNames.name(code)
        default: "Locations"
        }
    }
    private var membership: ((Place) -> Bool)? {
        switch destination {
        case .type(let type): { $0.browseTypes.contains(type) }
        case .feature(let feature): { $0.siteFeatures.contains(feature) }
        case .status(let status): { $0.statusGroup == status }
        default: nil
        }
    }
    private var base: [Place] {
        switch destination {
        case .visited: store.visitedPlaces
        case .saved: store.journal.savedPlaces.map(store.currentPlace)
        case .region(let code): store.places.filter { $0.region == code }
        default: store.places
        }
    }
    private var sort: GallerySort {
        let value = GallerySort(rawValue: storedSort) ?? .name
        return value == .recent && destination != .visited ? .name : value
    }
    private var shown: [Place] {
        var list = base
        if let membership { list = list.filter { showOther ? !membership($0) : membership($0) } }
        list = list.filter { $0.matches(search) && filter.matches($0) }
        switch sort {
        case .name: return list.sorted { $0.guideName.localizedStandardCompare($1.guideName) == .orderedAscending }
        case .region: return list.sorted { ($0.region, $0.city, $0.guideName) < ($1.region, $1.city, $1.guideName) }
        case .recent: return list
        case .nearest:
            guard location.location != nil else { return list }
            return list.sorted { (location.distance(to: $0) ?? .greatestFiniteMagnitude) < (location.distance(to: $1) ?? .greatestFiniteMagnitude) }
        }
    }
    private func subtitle(_ place: Place) -> String? {
        if sort == .nearest, let distance = location.distanceLabel(to: place) { return "\(distance) · \(place.region)" }
        if destination == .visited, let visit = store.visits(to: place).first {
            return visit.visitedAt.formatted(date: .long, time: .omitted)
        }
        return nil
    }

    var body: some View {
        let places = shown
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let membership {
                    Picker("Show", selection: $showOther) {
                        Text("\(title) (\(base.filter(membership).count))").tag(false)
                        Text("Other (\(base.filter { !membership($0) }.count))").tag(true)
                    }.pickerStyle(.segmented)
                }
                if filter.count > 0 || sort == .nearest {
                    HStack {
                        Text(sort == .nearest && location.location != nil ? "\(places.count) locations · nearest first" : "\(places.count) locations")
                        Spacer()
                        if filter.count > 0 { Button("Clear Filters") { filter = GalleryFilter() }.fontWeight(.semibold) }
                    }.font(.footnote).foregroundStyle(.secondary)
                }
                if sort == .nearest, let message = location.message {
                    Text(message).font(.footnote).foregroundStyle(.secondary)
                }
                if let notice = store.catalogBanner { Text(notice).font(.footnote).foregroundStyle(.secondary) }
                if places.isEmpty { emptyState } else { content(places) }
            }.padding(.horizontal, 16).padding(.bottom, 24)
                .background { GeometryReader { proxy in Color.clear.onAppear { width = proxy.size.width }
                    .onChange(of: proxy.size.width) { _, value in width = value } } }
        }
        .background(palette.paper)
        .scrollDismissesKeyboard(.immediately)
        .refreshable { await store.refreshCatalog(force: true) }
        .navigationTitle(title).inlineNavigationTitle()
        .searchable(text: $search, prompt: "Find a location")
        .toolbar {
            ToolbarItem(placement: .primaryAction) { optionsMenu }
        }
        .sheet(isPresented: $showFilter) { FilterSheet(filter: $filter, places: base).spotterEnvironment(store) }
    }

    @ViewBuilder private func content(_ places: [Place]) -> some View {
        switch GalleryLayout(rawValue: layout) ?? .grid {
        case .grid:
            // Two columns on phones and narrow panes, like Facades; wider panes add a column per ~340 pt.
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? max(1, Int((width - 32) / 520)) : max(2, Int((width - 32) / 340))), spacing: 8) {
                ForEach(places) { place in link(place) { PlaceCard(place: place, subtitle: subtitle(place)) } }
            }
        case .thumbnails:
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: max(1, Int((width - 32) / 560))), spacing: 10) {
                ForEach(places) { place in link(place) { PlaceCard(place: place, subtitle: subtitle(place), aspect: 16 / 9) } }
            }
        case .list:
            LazyVStack(spacing: 0) {
                ForEach(places) { place in
                    link(place) { PlaceListRow(place: place, subtitle: subtitle(place)) }
                    if place.id != places.last?.id { Divider().padding(.leading, 104) }
                }
            }.padding(.horizontal, 12).padding(.vertical, 4)
                .background(palette.surface, in: RoundedRectangle(cornerRadius: 12))
        }
    }
    private func link<Label: View>(_ place: Place, @ViewBuilder label: () -> Label) -> some View {
        NavigationLink(value: Route.place(place.id)) { label() }.buttonStyle(.plain)
    }

    private var optionsMenu: some View {
        Menu {
            Picker("Sort", selection: Binding(get: { sort.rawValue }, set: { value in
                storedSort = value
                if value == GallerySort.nearest.rawValue { location.request() }
            })) {
                ForEach(GallerySort.allCases.filter { $0 != .recent || destination == .visited }, id: \.self) { option in
                    Label(option.rawValue, systemImage: option == .nearest ? "location" : option == .recent ? "clock" : "textformat")
                        .tag(option.rawValue)
                }
            }
            Picker("Layout", selection: $layout) {
                ForEach(GalleryLayout.allCases, id: \.self) { Label($0.rawValue, systemImage: $0.symbol).tag($0.rawValue) }
            }
            Divider()
            Button { showFilter = true } label: {
                Label(filter.count == 0 ? "Filter…" : "Filter (\(filter.count))…", systemImage: "line.3.horizontal.decrease")
            }
        } label: { Image(systemName: filter.count > 0 ? "ellipsis.circle.fill" : "ellipsis.circle") }
            .accessibilityLabel("View options")
    }

    @ViewBuilder private var emptyState: some View {
        let unfiltered = search.isEmpty && filter.count == 0
        if unfiltered && destination == .visited {
            EmptyCollection(symbol: "checkmark.seal", title: "No Visits",
                            message: "Open any location and tap Visit to start your collection. Visits sync privately with iCloud.")
        } else if unfiltered && destination == .saved {
            EmptyCollection(symbol: "bookmark", title: "No Saved Places", message: "Tap the bookmark on any location to save it here.")
        } else {
            EmptyCollection(symbol: "magnifyingglass", title: "No Locations", message: "Try another search or clear your filters.")
        }
    }
}

/// Facades' empty state: an icon tile, a title, and one line of help.
struct EmptyCollection: View {
    let symbol: String
    let title: String
    let message: String
    var body: some View {
        VStack(spacing: 10) {
            IconTile(symbol: symbol, color: .visited, size: 64)
            Text(title).font(.title3.bold())
            Text(message).font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }.frame(maxWidth: 360).frame(maxWidth: .infinity).padding(.vertical, 60)
    }
}

/// Facades' Filter sheet: two-column toggle buttons grouped by kind, with Clear and Done.
private struct FilterSheet: View {
    @Binding var filter: GalleryFilter
    let places: [Place]
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    group("Location Type", PlaceType.allCases.filter { type in places.contains { $0.browseTypes.contains(type) } },
                          title: { $0.browseTitle }, selected: \.types)
                    group("Site Feature", GlossaryEntry.features(in: places), title: { $0 }, selected: \.features)
                    group("Status", PlaceStatusGroup.allCases.filter { status in status != .listed && places.contains { $0.statusGroup == status } },
                          title: { $0.rawValue }, selected: \.statuses)
                    group("State or Province", Array(Set(places.map(\.region))).sorted(), title: { RegionNames.name($0) }, selected: \.regions)
                }.padding(16)
            }.background(GuidePalette(scheme: scheme).paper)
                .navigationTitle("Filter").inlineNavigationTitle()
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Clear") { filter = GalleryFilter() }.disabled(filter.count == 0) }
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                }
        }
    }
    private func group<Value: Hashable>(_ heading: String, _ values: [Value], title: @escaping (Value) -> String,
                                        selected: WritableKeyPath<GalleryFilter, Set<Value>>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(heading).font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(values, id: \.self) { value in
                    let on = filter[keyPath: selected].contains(value)
                    Button {
                        if on { filter[keyPath: selected].remove(value) } else { filter[keyPath: selected].insert(value) }
                    } label: {
                        Text(title(value)).font(.subheadline.weight(.medium)).lineLimit(2).multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity, minHeight: 40).padding(.horizontal, 6)
                            .foregroundStyle(on ? GuidePalette(scheme: scheme).onAccent : Color.accentColor)
                            .background(on ? Color.accentColor : Color.accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                    }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }
}

// MARK: - Lists

/// Facades' Lists: visit statistics, then each collection with its count.
struct ListsView: View {
    @EnvironmentObject private var store: SpotterStore
    @EnvironmentObject private var sync: CloudSyncStatus
    @Environment(\.colorScheme) private var scheme
    @Environment(\.sidebarVisible) private var wide
    @State private var showBaseCampPicker = false
    private var palette: GuidePalette { .init(scheme: scheme) }
    var body: some View {
        let visited = store.visitedPlaces
        let inDirectory = visited.filter { place in store.places.contains { $0.id == place.id } }.count
        let share = store.places.isEmpty ? 0 : Double(inDirectory) / Double(store.places.count)
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    StatTile(value: "\(visited.count)", label: "Places Visited", symbol: "checkmark.seal.fill")
                    StatTile(value: share.formatted(.percent.precision(.fractionLength(1))), label: "Of All Locations")
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: wide ? 2 : 1), spacing: 10) {
                    listRow(.receipts, "Visit Receipts", "ticket.fill", .gray, store.visits.count)
                    listRow(.visited, "Visited", "checkmark.seal.fill", .visited, visited.count)
                    listRow(.saved, "Saved", "bookmark.fill", palette.accent, store.journal.savedPlaces.count)
                    if let camp = store.baseCamp {
                        NavigationLink(value: Route.place(camp.id)) { collectionLabel("Base Camp", "tent.fill", .brown, detail: camp.guideName) }
                            .buttonStyle(.plain)
                    } else {
                        Button { showBaseCampPicker = true } label: { collectionLabel("Base Camp", "tent.fill", .brown, detail: "Choose") }
                            .buttonStyle(.plain)
                    }
                }
                Text("Visited by Type").font(.headline).padding(.top, 10)
                VStack(spacing: 0) {
                    ForEach(PlaceType.allCases) { type in
                        let total = store.places.filter { $0.browseTypes.contains(type) }.count
                        let mine = visited.filter { $0.browseTypes.contains(type) }.count
                        NavigationLink(value: Route.destination(.type(type))) {
                            HStack(spacing: 10) {
                                IconTile(symbol: type.symbol, color: type.browseColor(in: scheme))
                                Text(type.browseTitle).font(.subheadline)
                                Spacer()
                                Text("\(mine) of \(total)").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                                Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
                            }.padding(.vertical, 10).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                        if type != PlaceType.allCases.last { Divider().padding(.leading, 34) }
                    }
                }.padding(.horizontal, 12).background(palette.surface, in: RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 8) {
                    if let notice = store.storageNotice {
                        Label(notice, systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.secondary)
                    }
                    Label(sync.title, systemImage: "icloud").font(.footnote).foregroundStyle(.secondary)
                    Text("Visits, notes, saved places, and Base Camp are private and sync only with your iCloud account.")
                        .font(.footnote).foregroundStyle(.secondary)
                    if !store.visits.isEmpty || !store.journal.savedPlaces.isEmpty { ExportJournalButton() }
                }.padding(.top, 10)
            }.padding(16).frame(maxWidth: 900).frame(maxWidth: .infinity)
        }
        .background(palette.paper)
        .navigationTitle("Lists").inlineNavigationTitle()
        .sheet(isPresented: $showBaseCampPicker) { BaseCampPicker().spotterEnvironment(store) }
    }
    private func listRow(_ destination: Destination, _ title: String, _ symbol: String, _ color: Color, _ count: Int) -> some View {
        NavigationLink(value: Route.destination(destination)) { collectionLabel(title, symbol, color, count: count) }.buttonStyle(.plain)
    }
    private func collectionLabel(_ title: String, _ symbol: String, _ color: Color, count: Int? = nil, detail: String? = nil) -> some View {
        HStack(spacing: 10) {
            IconTile(symbol: symbol, color: color)
            Text(title).font(.body.weight(.semibold))
            Spacer()
            if let detail { Text(detail).font(.subheadline).foregroundStyle(.secondary).lineLimit(1) }
            if let count {
                Text("\(count)").font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(color == palette.accent ? palette.onAccent : .white)
                    .padding(.horizontal, 8).padding(.vertical, 2).background(color, in: Capsule())
            }
        }.padding(12).frame(maxWidth: .infinity)
            .background(color.opacity(scheme == .dark ? 0.22 : 0.12), in: RoundedRectangle(cornerRadius: 12))
            .contentShape(Rectangle())
    }
}

private struct StatTile: View {
    let value: String
    let label: String
    var symbol: String? = nil
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                if let symbol { Image(systemName: symbol).foregroundStyle(Color.visited).font(.title3) }
                Text(value).font(.title.bold().monospacedDigit()).foregroundStyle(GuidePalette(scheme: scheme).accent)
            }
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, minHeight: 76)
            .background(GuidePalette(scheme: scheme).surface, in: RoundedRectangle(cornerRadius: 12))
            .accessibilityElement(children: .combine)
    }
}

// MARK: - States & Provinces

struct RegionsView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        List {
            ForEach(["US", "CA"], id: \.self) { country in
                let regions = Dictionary(grouping: store.places.filter { $0.country == country }, by: \.region)
                if !regions.isEmpty {
                    Section(country == "US" ? "United States" : "Canada") {
                        ForEach(regions.keys.sorted { RegionNames.name($0) < RegionNames.name($1) }, id: \.self) { code in
                            NavigationLink(value: Route.destination(.region(code))) {
                                HStack(spacing: 10) {
                                    Text(code).font(.caption.weight(.bold)).foregroundStyle(.white)
                                        .frame(minWidth: 36).padding(.vertical, 3)
                                        .background(country == "US" ? GuidePalette(scheme: scheme).accent : .blue, in: Capsule())
                                    Text(RegionNames.name(code))
                                    Spacer()
                                    CountCapsule(count: regions[code]?.count ?? 0)
                                }
                            }
                        }
                    }
                }
            }
            Section { } footer: { Text("Counts include every listed location, including coming-soon locations.") }
        }
        .navigationTitle("States & Provinces").inlineNavigationTitle()
    }
}

struct CountCapsule: View {
    let count: Int
    var body: some View {
        Text("\(count)").font(.caption.weight(.bold).monospacedDigit()).foregroundStyle(.black.opacity(0.8))
            .padding(.horizontal, 9).padding(.vertical, 2).background(Color.visited, in: Capsule())
    }
}

enum RegionNames {
    private static let names: [String: String] = [
        "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado",
        "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia",
        "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
        "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts",
        "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
        "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
        "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
        "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota",
        "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
        "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "PR": "Puerto Rico",
        "AB": "Alberta", "BC": "British Columbia", "MB": "Manitoba", "NB": "New Brunswick",
        "NL": "Newfoundland and Labrador", "NS": "Nova Scotia", "ON": "Ontario", "PE": "Prince Edward Island",
        "QC": "Quebec", "SK": "Saskatchewan", "NT": "Northwest Territories", "NU": "Nunavut", "YT": "Yukon"
    ]
    static func name(_ code: String) -> String { names[code] ?? code }
}

// MARK: - Glossary

/// Plain definitions for location types and the site features the directory publishes.
struct GlossaryEntry: Identifiable, Hashable {
    let id: String
    let title: String
    let kind: String
    let symbol: String
    let color: Color
    let text: String
    let destination: Destination

    static func type(_ type: PlaceType) -> GlossaryEntry {
        let text: String
        switch type {
        case .ran: text = "Rivian’s DC fast-charging network for road trips. Many sites are open to other EVs; check connector compatibility before you go."
        case .waypoint: text = "Rivian’s Level 2 chargers at hosts such as hotels, parks, and restaurants, suited to longer stops."
        case .space: text = "Rivian’s retail locations, where you can see vehicles and talk with Rivian staff."
        case .demo: text = "Locations that offer Rivian demo drives. Booking may be required."
        case .service: text = "Rivian locations that service vehicles, usually by appointment."
        case .outpost: text = "Rivian charging outposts: charging sites in scenic places, often with their own amenities."
        }
        return GlossaryEntry(id: "type:\(type.rawValue)", title: type.browseTitle, kind: "Location Type", symbol: type.symbol,
                             color: Color(hex: type.mapColorHex), text: text, destination: .type(type))
    }

    static func feature(_ feature: String) -> GlossaryEntry {
        let (symbol, color, text): (String, Color, String) = switch feature {
        case "DC Fast Charging": ("bolt.fill", Color(hex: PlaceType.ran.mapColorHex), "Direct-current fast charging for quick road-trip stops.")
        case "Level 2 Charging": ("powerplug.fill", Color(hex: PlaceType.waypoint.mapColorHex), "Alternating-current charging suited to longer stops, such as an overnight stay or a meal.")
        case "Open to Other EVs", "Open to All": ("car.2.fill", .teal, "Listed as open to EVs from other makers. Check connector compatibility and the host’s access rules.")
        case "Rivian Vehicles Only": ("lock.fill", .gray, "Rivian lists these chargers for Rivian vehicles only. Other EVs can’t charge here.")
        case "Charging", "Charging outpost": ("bolt.fill", Color(hex: PlaceType.outpost.mapColorHex), "Rivian lists charging at this location.")
        case "Service coming soon": ("wrench.and.screwdriver", Color(hex: PlaceType.service.mapColorHex), "Rivian lists service at this location as coming soon.")
        case "Plug & Charge": ("cable.connector", .blue, "Charging starts when a supported vehicle with a linked account plugs in, without a card or app.")
        case "Trailer OK": ("arrow.left.and.right", .brown, "Listed as accommodating vehicles towing a trailer.")
        case "Coffee": ("cup.and.saucer.fill", .brown, "Coffee is listed at or near this location.")
        case "Food": ("fork.knife", .orange, "Food is listed at or near this location.")
        case "Lodging": ("bed.double.fill", .indigo, "Lodging is listed at or near this location.")
        case "Restroom": ("figure.dress.line.vertical.figure", .cyan, "A restroom is listed at or near this location.")
        case "See vehicles": ("car.fill", Color(hex: PlaceType.space.mapColorHex), "Rivian vehicles are listed as on display.")
        case "Demo drives": ("steeringwheel", Color(hex: PlaceType.demo.mapColorHex), "Demo drives are listed as available. Booking may be required.")
        case "Service appointments": ("wrench.and.screwdriver.fill", Color(hex: PlaceType.service.mapColorHex), "Rivian service is listed as available by appointment.")
        default: ("sparkles", .pink, "Listed by Rivian for this location.")
        }
        return GlossaryEntry(id: "feature:\(feature)", title: feature, kind: "Site Feature", symbol: symbol, color: color,
                             text: text, destination: .feature(feature))
    }

    /// Tags that stay on place pages but aren't browsable features: "Charging" and "Charging outpost"
    /// repeat what the location type already says, and "Service coming soon" is a status.
    static let notBrowsable: Set<String> = ["Charging", "Charging outpost", "Service coming soon"]

    /// Browsable features present in the directory, most common first.
    static func features(in places: [Place]) -> [String] {
        var counts: [String: Int] = [:]
        for feature in places.flatMap(\.siteFeatures) where !notBrowsable.contains(feature) { counts[feature, default: 0] += 1 }
        return counts.keys.sorted { counts[$0]! == counts[$1]! ? $0 < $1 : counts[$0]! > counts[$1]! }
    }
}

struct GlossaryView: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    @State private var kind = "All"
    var body: some View {
        let entries = (kind == "Site Features" ? [] : PlaceType.allCases.map(GlossaryEntry.type))
            + (kind == "Location Types" ? [] : GlossaryEntry.features(in: store.places).map(GlossaryEntry.feature))
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Picker("Show", selection: $kind) {
                    ForEach(["All", "Location Types", "Site Features"], id: \.self) { Text($0).tag($0) }
                }.pickerStyle(.segmented)
                ForEach(entries) { entry in
                    NavigationLink(value: Route.destination(entry.destination)) { GlossaryRow(entry: entry) }.buttonStyle(.plain)
                }
            }.padding(16).frame(maxWidth: 760).frame(maxWidth: .infinity)
        }.background(GuidePalette(scheme: scheme).paper)
            .navigationTitle("Glossary").inlineNavigationTitle()
    }
}

private struct GlossaryRow: View {
    let entry: GlossaryEntry
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            IconTile(symbol: entry.symbol, color: entry.color, size: 44)
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.headline)
                Text(entry.kind).font(.caption).foregroundStyle(.secondary)
                Text(entry.text).font(.subheadline).fixedSize(horizontal: false, vertical: true).padding(.top, 2)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
        }.padding(14).background(GuidePalette(scheme: scheme).surface, in: RoundedRectangle(cornerRadius: 14))
            .contentShape(Rectangle())
    }
}

/// Opened from a place's type pill or feature chip, like Facades' design-style sheet.
struct GlossarySheet: View {
    let entry: GlossaryEntry
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.navigate) private var navigate
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let count = store.places.filter { place in
            switch entry.destination {
            case .type(let type): place.browseTypes.contains(type)
            case .feature(let feature): place.siteFeatures.contains(feature)
            default: false
            }
        }.count
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                LinearGradient(colors: [entry.color, entry.color.opacity(0.65)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Image(systemName: entry.symbol).font(.system(size: 64, weight: .light)).foregroundStyle(.white.opacity(0.9))
            }.frame(height: 180).overlay(alignment: .topTrailing) {
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.title2).symbolRenderingMode(.palette)
                        .foregroundStyle(.white, .black.opacity(0.3))
                }.buttonStyle(.plain).padding(12).accessibilityLabel("Close")
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.title).font(.title2.bold())
                Text(entry.kind).font(.subheadline).foregroundStyle(.secondary)
                Text(entry.text).font(.body).padding(.top, 6).fixedSize(horizontal: false, vertical: true)
                Button {
                    dismiss(); navigate(.destination(entry.destination))
                } label: { Label("Browse \(count) \(count == 1 ? "Location" : "Locations")", systemImage: "square.grid.2x2").cardButton(prominent: true) }
                    .buttonStyle(.plain).padding(.top, 14)
            }.padding(20)
            Spacer(minLength: 0)
        }.background(GuidePalette(scheme: scheme).paper)
            .presentationDetents([.medium, .large])
    }
}

// MARK: - Base Camp

struct BaseCampPicker: View {
    @EnvironmentObject private var store: SpotterStore
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Base Camp is the location you think of as home, like the charger you use most or your Service Center. It syncs privately with iCloud.")
                        .font(.footnote).foregroundStyle(.secondary)
                    if store.baseCamp != nil {
                        Button("Remove Base Camp", role: .destructive) {
                            if store.perform({ try $0.setBaseCamp(nil) }) { dismiss() }
                        }
                    }
                }
                Section {
                    ForEach(store.places.filter { $0.matches(search) }
                        .sorted { $0.guideName.localizedStandardCompare($1.guideName) == .orderedAscending }) { place in
                        Button {
                            if store.perform({ try $0.setBaseCamp(place) }) { dismiss() }
                        } label: {
                            HStack(spacing: 10) {
                                PlaceImageView(place: place).frame(width: 52, height: 34).clipShape(RoundedRectangle(cornerRadius: 5))
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(place.guideName).font(.subheadline.weight(.semibold))
                                    Text("\(place.cardCaption) · \(place.cardSubtitle)").font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if store.isBaseCamp(place) { Image(systemName: "checkmark").foregroundStyle(Color.accentColor) }
                            }.contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                }
            }
            .searchable(text: $search, prompt: "Find a location")
            .navigationTitle("Choose Base Camp").inlineNavigationTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}
