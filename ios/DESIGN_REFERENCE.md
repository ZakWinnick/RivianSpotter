# Native design reference — October 21, 2026

The app follows Facades 2.0.8 (Michael Steeber's Apple Store field guide) on iPhone and iPad, with the website's colors: forest/sage accent, neutral surfaces, and the per-type map colors.

## Reference inspected

Every Facades screen was reviewed in the installed app without changing its data: All Stores (grid, thumbnails, list, view options, filter), store details (address, timeline, design-style and feature sheets), Lists, Visited, Bookmarks, visit receipts, Regions, United States, Years, Store Data, Global Map, design-style and feature pages, Extras, Home Store, Glossary, and Settings.

## Mapping

| Facades | RivianSpotter |
|---|---|
| All Stores | All Locations |
| Design Style / Store Feature | Location Type / Site Feature (published tags) |
| Extras (Moved, Closed…) | Status (Coming Soon, Unconfirmed, and others when present) |
| Store number pill | Location type pill |
| Timeline | Record: published listing status and the date it was checked |
| Regions / United States | States & Provinces |
| Store Data | Location Data |
| Global Map | Map |
| Bookmarks | Saved |
| Home Store | Base Camp (synced) |
| Visit receipts | Visit receipts (no notes) |

Left out: opening dates and the Years page, store numbers, Moved/Rebuilt/Renamed, Favorites/Wish List/custom lists, and Look Around. The directory doesn't publish the data, or the feature would need a journal schema change.

## Rules

- Never invent coordinates, history, or open/closed claims. "Unconfirmed" means Rivian's listing gives no status.
- Category photos are labeled on cards and place pages. A place without a photo shows its type color and symbol.
- Orange is only for the person's own visits. Accent fills use dark text in Dark mode.
- System text styles throughout, so Dynamic Type scales every screen.
