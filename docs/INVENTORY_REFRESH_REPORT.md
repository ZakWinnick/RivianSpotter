# Official inventory refresh report

Verified public-source retrieval date: **2026-10-14**. This is a local dataset refresh, not a deployment or on-site verification.

## Evidence and inventory

- Read the complete [official Rivian directory](https://rivian.com/spaces/locations): 116 unique articles and official slugs, including streamed headings beyond the first rendered listings.
- Fetched all 116 linked official detail pages. Each URL and SHA-256 response hash is recorded in data/refresh-summary.json.
- Extracted the service GeoJSON embedded in the [Calgary official detail page](https://rivian.com/spaces/calgary-service-demo-center), deduplicating repeated feature sets into 103 distinct North American service addresses. Excluded two German service entries from the North American product inventory.
- Of those service addresses, 64 match directory places and 39 provide supplemental service-only places. Their provenance is explicit and general visitor hours are null.
- Reconciled historical canonical JSON (86) and browser JS (126); their union contains 126 historical IDs. Both original arrays remain in location-history.json.
- Final canonical inventory: **160 places = 116 directory + 39 supplemental service + 5 unmatched legacy**. 36 places received new IDs. All old browser IDs remain as identities or aliases; Seattle86→73 and Queens123→107.
- Coordinates: 125 official coordinate/address matches and 35 unknown/null. 27 places require review. Unknown coordinates are distinct from unknown operating status.

Directory hash: 1022a89e83b31b99cd179a3e2222f31b04dff2f2f6c546cdbb8f963bf5223eda.

Supplemental detail response hash: 4684e80539847ca718afac2af455984626a40f8b80293eb2cd5ef255c9292ba6.

## Material source discoveries

The old JSON and JS differed in both size and facts, including a Seattle ID73 address conflict. The browser version was the later baseline for a shared historical ID; maintained facts now come from the current official sources. Unmatched historical claims are preserved in legacySnapshot, while current coordinates, hours, phone and capabilities are cleared and lastVerified remains null.

The official detail schema can lag the current directory. Scottsdale's directory lists Kierland Commons at15051 North Kierland Boulevard180F1B and phone(520)338-2981; detail JSON-LD lists6502 E Monte Cristo Avenue and older hours/phone. The directory is authoritative for the current place facts and incompatible schema coordinates are withheld. Other detail/address conflicts are listed below.

Yosemite's official FAQ says demo drives are not available there while the directory supplies a booking link. The canonical record retains outpost/charging capability, removes demo-drive and booking, and records the conflict for review. Colma's directory publishes operating hours while the embedded service map says in_the_works; current operating availability requires confirmation. Planned Plymouth and San Jose Dobbin service sites retain planned status and do not become currently open because schedule fields exist.

Rocklin’s headline omits its service role, while official schedules and feature badges publish service appointments and EV charging. It now includes both capabilities, a separate Open 24/7 charging schedule and charging phone. Miramar publishes general/demo hours plus Service coming soon: its visitor status is open, serviceStatus is planned, and it offers no current service appointment capability. General and service schedules remain separate. Caledonia's source publishes a malformed Sat–Sat service entry; the raw text and uncertainty remain visible. Canadian Closed on10/12 exceptions lack a published year; they are preserved in publishedHoursExceptions and readable notes, with no automatic dated exception. No photographs were copied because redistribution rights were not established.

## Review queue

| ID | Place | Reason |
| --- | --- | --- |
| 2 | Scottsdale, AZ | Official detail structured data lists a different address (6502 E Monte Cristo Ave); its coordinates were withheld. The directory address is used. |
| 10 | El Segundo, CA | Official detail structured data lists a different address (401 Coral Circle); its coordinates were withheld. The directory address is used. |
| 19 | San Jose, CA | Official detail structured data lists a different address (300 Santana Row , #105); its coordinates were withheld. The directory address is used. |
| 25 | Yosemite, CA Charging Outpost | Official detail FAQ says demo drives are not offered here; the directory also displays a booking link. Confirm with Rivian. |
| 39 | Skokie, IL Old Orchard | Official detail structured data lists a different address (4999 Old Orchard Road, Suite M36); its coordinates were withheld. The directory address is used. |
| 45 | Caledonia, MI - Service + Demo Center | Published service hours contain “Sat–Sat”; Sunday service hours are unclear. |
| 52 | Brooklyn, NY | Official detail structured data lists a different address (366 Wyth Ave.); its coordinates were withheld. The directory address is used. |
| 59 | Montreal - Service + Demo Center | Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified. |
| 62 | Nashville, TN | Official detail structured data lists a different address (1808 West End Ave); its coordinates were withheld. The directory address is used. |
| 65 | Dallas, TX | Official detail structured data lists a different address (310 Knox Street); its coordinates were withheld. The directory address is used. |
| 66 | Dallas, TX - Service + Demo Center | Official detail structured data lists a different address (2512 Hawes); its coordinates were withheld. The directory address is used. |
| 75 | The Hamptons, NY Charging Outpost | Official detail structured data lists a different address (605 County Road 39); its coordinates were withheld. The directory address is used. |
| 78 | The Grove | Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified. |
| 79 | Palo Alto, CA | Official detail structured data lists a different address (3215 Porter Dr); its coordinates were withheld. The directory address is used. |
| 124 | Martinez - Service Center | Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified. |
| 125 | Niagara Falls - Service Center | Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified. |
| 126 | Stallings - Service Center | Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified. |
| 127 | Calabasas, CA The Commons | Official detail structured data lists a different address (4799 Commons Way); its coordinates were withheld. The directory address is used. |
| 128 | Boulder, CO | Official detail structured data lists a different address (2355 30th St); its coordinates were withheld. The directory address is used. |
| 130 | Dedham, MA | Official detail structured data lists a different address (480 Legacy Place); its coordinates were withheld. The directory address is used. |
| 131 | Edina, MN | Official detail structured data lists a different address (3601 Galleria); its coordinates were withheld. The directory address is used. |
| 132 | East Rutherford, NJ American Dream | Official detail structured data lists a different address (1 American Dream Way, Space D240); its coordinates were withheld. The directory address is used. |
| 138 | Colma, CA - Service + Demo Center | The directory publishes operating hours but the embedded service map labels this site in the works. Confirm current availability with Rivian. |
| 141 | Ventura, CA - Service + Demo Center | Official detail structured data lists a different address (4880 Colt St); its coordinates were withheld. The directory address is used. |
| 145 | Miramar, FL - Service + Demo Center | Official detail structured data lists a different address (627 Southwest 145th Terrace); its coordinates were withheld. The directory address is used. |
| 147 | West Palm Beach, FL | Official detail structured data lists a different address (713 S Rosemary Ave); its coordinates were withheld. The directory address is used. |
| 149 | Lynnfield, MA | Official detail structured data lists a different address (600 Market Street); its coordinates were withheld. The directory address is used. |

## Verification

Executed node --test tests/data-refresh.test.cjs after the final reconciliation: **16 tests passed; 0 failed**. These cover streamed parsing, completeness failure paths, safe official URLs, address equivalence, schedule separation, stale schema coordinates, ID/alias preservation, canonical/generated equality, official-directory coverage, supplemental planned states schema/provenance, independent visitor/service operation states, source-supported charging capability and explicit coordinate-verification limits. The initial six inventory assertions failed against the old data; after applying refreshed evidence they passed.

Replayed the exact116-page capture into a separate staging directory after the review fixes and compared the entire canonical array: **identical records**, zero additions on replay. A generator run deterministically matches the browser array byte-for-byte.

All downloads and reconciliation completed before canonical mutation. No Git commit, push, publishing, API credentials or repository write tokens were used. Integration/build/browser checks belong to the parent implementation task.

## Remaining limits

Public source publication does not establish visit/appointment availability. Official embedded data can itself conflict or lag. A missing directory listing does not prove a legacy place closed. Timezones are derived from locality, not published by Rivian, and future locations in split-timezone states require review.35 locations have no safely matched official coordinates; map placement must remain absent and directions should use the published address. Raw yearless exceptions cannot be used to infer a dated closure. The exact downloaded HTML capture resides in temporary local files; the repository keeps parsed facts and hashes rather than redistributing full official pages.
