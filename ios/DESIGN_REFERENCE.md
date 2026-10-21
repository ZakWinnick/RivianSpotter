# Native design reference — October 20, 2026

The latest user direction is to closely follow Facades on iPhone and iPad. This supersedes the earlier website-sidebar tile and cream/yellow visual experiments, while keeping complete website information in native place pages.

## Reference inspected

Inspected the installed Facades application, not only marketing screenshots: All Stores gallery; Apple Del Amo and Apple The Exchange TRX detail pages; the Address/map sheet; and the Timeline sheet. No reference-app visits or bookmarks were changed.

## Implementation

- Compact: four bottom tabs, centered gallery title, search, two-column photographic cards, Near me and map controls.
- Wide (700 points or more): persistent 245-point sidebar and an adaptive gallery/detail pane. Narrow iPad windows use the compact arrangement.
- Detail: 16:9 photo above the name, small type/status and Visit pills, grouped address/map and information cards. Use actual Rivian data; no invented history, dates, or awards.
- Information: hours, separate network facts, reported status dates, current rate summaries, expandable schedules and chargers, internal nearby-site navigation, visit records, and source references.
- Appearance: System default; Light and Dark overrides. Neutral backgrounds and cards, purple controls, system typography. No green-black light background.
- Photos: exact-site images first; category fallbacks labeled. Source credit retained.
- Location: every category supports one-shot Near me, distance sorting, and map centering. Unknown coordinates stay unknown.

## Verification boundary

Universal iPhone/iPad simulator build succeeds. Compact and expanded layouts have been inspected on the available iPhone Duo simulator. A dedicated iPad simulator run remains pending installation of a compatible runtime. Signed two-device iCloud transfers remain unverified.
