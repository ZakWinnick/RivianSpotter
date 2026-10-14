# Explorer overhaul verification — 2026-10-14

Release 2026.42.4. This record captures pre-publication verification; public propagation is checked separately after release.

## Inventory

- 160 canonical places: 116 official-directory listings, 39 supplemental official service locations, five unmatched legacy records retained without current operating claims.
- 36 newly added records; all 126 historical IDs remain canonical IDs or aliases.
- 125 exact official coordinate/address matches. 35 map positions remain unknown; precise directions are withheld.
- 27 records require review. Published facts and map-position confidence are separate.
- General, service and charging hours remain separate. Miramar service is upcoming while visits/demo drives are open; Rocklin service and 24/7 charging are included.
- Exact source URLs, hashes, field changes, aliases and limitations are in refresh-summary.json and the inventory refresh report.

## Automated verification

- 46 behavioral/data/operations tests passed.
- Production build generated 210 HTML pages; every internal route and asset reference resolved.
- Production dependency audit: zero known vulnerabilities.
- Release artifact excludes environment files, retired PHP routes, historical admin write modules and source maps.
- Independent review findings were fixed and rechecked. Final review found no blocking issues.

## Browser verification

- Desktop explorer: rendered Mapbox map, consistent categories, selection and official actions.
- Phone at 390 × 844: no horizontal overflow, usable detail sheet, working List/Map mode and map rendering.
- Tablet at 820px: no horizontal overflow; Near me retains an accessible label.
- Light and dark theme transitions.
- Search, compound intent/open filters, empty-state reset, stable historical link 86 → Seattle.
- Keyboard Enter selects a location; semantic buttons and visible focus.
- Saved Venice survived navigation and appeared on the Saved page; destination page and correction prefill worked.
- Real location lookup returned unavailable and displayed the city/region fallback. Precise successful geolocation was not exercised.
- Deliberately blocked Mapbox requests produced the recoverable map error while the result list and full details remained usable. Requests were restored and retry recovered.
- The existing local old-worker installation initially exposed stale assets. The fix now reloads versioned shell assets and removes obsolete caches; the cached local preview upgraded successfully to the new UI and versioned scripts.
- No appointments, external shares, emails or correction submissions were sent during testing.

## Boundaries

Responsive checks used browser emulation, not physical phones. Native share-sheet completion, successful precise geolocation, and a full offline browser restart were not exercised. Cache denial/offline responses were tested against the actual service-worker handlers. No copied official photos are used; destination pages link to the official galleries.

Screenshots: docs/screenshots/desktop-explorer.jpg, mobile-detail.jpg and mobile-map.jpg.

## Short desktop follow-up

The first public release passed deployment and exact dataset-byte comparison. A subsequent 1280 × 720 live check exposed the desktop detail panel extending below the viewport. Release 2026.42.4 constrains its maximum height relative to the explorer. Local browser verification: panel bounds top 160 / bottom 688 in a 720px window, with internal scrolling; phone bounds remain top 258 / bottom 844 in a 390 × 844 viewport.
