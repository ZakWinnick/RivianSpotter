import AppIntents
import WidgetKit

/// The widget's Check In button. Runs in the widget extension, so the app doesn't open.
struct CheckInIntent: AppIntent {
    static var title: LocalizedStringResource = "Check In"
    static var isDiscoverable = false
    @Parameter(title: "Place") var placeID: String

    init() {}
    init(placeID: String) { self.placeID = placeID }

    func perform() async throws -> some IntentResult {
        if let directory = try? SharedStore.directory() {
            WidgetStore.checkIn(placeID: placeID, in: directory, defaults: WidgetStore.defaults)
        } else {
            WidgetStore.defaults?.set(["placeID": placeID, "at": Date().timeIntervalSince1970], forKey: WidgetStore.failedKey)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: WidgetStore.kind)
        return .result()
    }
}

/// The round refresh button: checks location again.
struct RefreshIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh"
    static var isDiscoverable = false

    func perform() async throws -> some IntentResult {
        WidgetCenter.shared.reloadTimelines(ofKind: WidgetStore.kind)
        return .result()
    }
}
