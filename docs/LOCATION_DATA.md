# Location data

`data/locations.json` is the authoritative inventory. `js/locations.js` is generated deterministically by `node scripts/generate-data.cjs`; edit the JSON, not the generated browser file. Public browser code never writes this inventory.

## Sources and coverage

The October 14, 2026 refresh read all **116 articles** in [Rivian’s official Spaces directory](https://rivian.com/spaces/locations), resolving streamed heading placeholders, and fetched all 116 linked official detail pages. The [Calgary detail page](https://rivian.com/spaces/calgary-service-demo-center) embeds an official service map. It contains 103 distinct North American service addresses after removing repeated features; 64 match directory listings and 39 supplement the directory. Two German entries are outside this product’s North American scope.

The resulting inventory has **160 places**: 116 directory listings, 39 supplemental service locations, and five retained unmatched legacy records. The historical canonical JSON had 86 records while the browser dataset had 126; both originals are preserved in `data/location-history.json`. All 126 browser IDs remain valid as canonical IDs or aliases. Seattle ID 86 aliases ID 73; Queens ID 123 aliases ID 107.

`data/refresh-summary.json` stores coverage counts, complete parsed directory facts, detail URL/hash evidence, additions, changed fields, merged IDs, the review queue and limits. `data/location-history.json` stores the original source arrays and refresh events. Retrieval hashes identify the exact public responses used; the HTML snapshots are not redistributed in the repository.

## Schema and evidence

| Field | Meaning |
| --- | --- |
| `id`, `slug`, `legacyIds` | Stable numeric identity, public path, optional old ID aliases. |
| `name`, `type` | Published place name; Space, Demo Center, Service Center or Outpost. |
| `address`, `city`, `state`, `country`, `postalCode` | Directory facts or supplemental service-map facts. Country is US or CA. An unmatched legacy address is retained for review only. |
| `lat`, `lng`, `coordinatePrecision`, `coordinateSource` | Numbers only when official coordinate data matches the current published street/address and region. `exact` means the source’s place point, not surveyed parking/entrance accuracy. Unverified coordinates are null with precision `unknown`. |
| `timezone`, `timezoneSource` | IANA timezone derived from the published locality; Rivian does not publish timezone identifiers. The current North American localities are mapped in the refresh script. New localities in states/provinces spanning timezones require review. |
| `hours`, `serviceHours`, `chargingHours`, `chargingPhone` | Separate raw published schedules with newlines and original punctuation. Charging schedules/phone are separated where explicitly published. General hours are null for service-only supplemental sites. Never use service hours as visitor hours. |
| `hoursExceptions` | Structured exceptions only when the complete date is known. Currently empty; no year is inferred. |
| `publishedHoursExceptions`, `notes` | Optional verbatim source exception such as “Closed on 10/12” and readable uncertainty notes. Undated/yearless exceptions are not applied automatically. |
| `phone`, `services`, `capabilities` | Current source phone and source-supported actions. Capabilities: see-vehicles, demo-drive, service, outpost, charging. Published service schedules, feature badges, matching official map evidence and explicit charging text establish capabilities even when a headline omits them; Rocklin includes service and charging. No guessed repairs/parts/retail claims. |
| `status`, `serviceStatus` | open, planned, temporarily-closed, closed or unknown. `open` means an operating listing/schedule, not that its doors are open at this moment. Embedded `in_the_works` service sites are planned. Service coming soon applies only to serviceStatus: Miramar general/demo operations remain open and service appointments are not offered as a current capability. |
| `rivianUrl`, `bookingUrl`, `sourceUrl` | HTTPS official destinations. Demo booking is supplied only where supported. A supplemental service site links to its source page rather than an invented detail slug. |
| `officialServiceId`, `officialDirectionsUrl` | Optional source identifiers and official outbound map link. Map links are not harvested for new coordinates. |
| `lastVerified`, `verificationStatus`, `verificationNote`, `sourceKind` | Public retrieval date, verified/needs-review, and directory/service-map/legacy provenance. Verified means the published facts were read; verificationNote explicitly separates this from unknown coordinates and on-site availability. |
| `legacySnapshot` | Unmatched historical claims preserved for maintenance only. Public coordinates/hours/phone/capabilities are cleared and status is unknown; lastVerified is null. |

There are 125 source-supported coordinate points and 35 places without reliable coordinates. Directory hours/phone/address take precedence over conflicting detail JSON-LD. Scottsdale, for example, has a current Kierland address while its detail schema points elsewhere, so schema coordinates are withheld. Official photos are omitted because redistribution rights were not established; the public site links to official galleries.

## Repeatable refresh

Run a read-only proposal from current public sources:

```sh
node scripts/refresh-locations.cjs --date YYYY-MM-DD --output-dir /tmp/rivian-refresh-review
```

Omitting `--output-dir` prints the result without writing any files. Review the staged summary and inventory, especially source conflicts, new localities/timezones and legacy matches. Apply the public-source refresh locally:

```sh
node scripts/refresh-locations.cjs --date YYYY-MM-DD --apply
node --test tests/data-refresh.test.cjs
```

The tool downloads every linked page before changing maintained data. Missing/incomplete articles, fewer than 100 directory records, unresolved streamed headings, duplicate slugs/IDs, invalid official URLs, failed requests and missing complete supplemental map data abort the refresh. It retains unmatched legacy places with bounded facts rather than inventing a closure. No API credentials, repository tokens, Git commits or deployments are involved.

For a previously captured response set:

```sh
node scripts/refresh-locations.cjs --date YYYY-MM-DD \
  --directory-file /tmp/rivian-directory.html \
  --details-dir /tmp/rivian-details --output-dir /tmp/rivian-review
```

The details folder contains `<official-slug>.html` for every directory article. Optional `--baseline-canonical-file` and `--baseline-browser-file` accept historical JSON arrays for an explicitly reviewed re-reconciliation; ordinary maintenance should omit them. A capture replay is not a fresh verification date: use the actual retrieval date.

After manual canonical edits, regenerate the browser data and run the data tests. Confirm review entries against primary official sources before changing verified status, coordinates or closure facts. The current test suite asserts complete summary-to-canonical coverage rather than freezing future inventory counts.
