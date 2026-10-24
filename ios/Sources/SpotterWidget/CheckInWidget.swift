import SwiftUI
import WidgetKit

/// Check in at the closest Rivian place without opening the app.
struct CheckInWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetStore.kind, provider: CheckInProvider()) { entry in
            CheckInFamilyView(entry: entry)
        }
        .configurationDisplayName("Check In")
        .description("Check in at the Rivian place you're at, or see the closest one.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
        .contentMarginsDisabled()
    }
}

struct CheckInFamilyView: View {
    let entry: CheckInEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // The Lock Screen draws its own material; the widget adds no colors.
            CheckInWidgetView(entry: entry, layout: .lock)
                .containerBackground(.clear, for: .widget)
                .widgetURL(WidgetLink.lockURL(for: entry.suggestion))
        default:
            CheckInWidgetView(entry: entry, layout: family == .systemMedium ? .medium : .small)
                .containerBackground(Color(hex: "#1b2620"), for: .widget)
                .environment(\.colorScheme, .dark)
                .widgetURL(WidgetLink.url(for: entry.suggestion))
        }
    }
}
