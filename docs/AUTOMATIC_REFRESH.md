# Automatic official-data refresh

The `Refresh official location and charging data` GitHub Actions workflow runs daily at **5:00 AM Pacific**, using `America/Los_Angeles` so daylight saving changes are handled automatically. GitHub may start scheduled jobs a little after the requested time. It can also be run manually from Actions. No personal access token, external scheduler, or manual approval is required.

## Lifecycle

1. Check out current `main` and install pinned dependencies.
2. Retrieve Rivian's official location directory, each location detail page, and supplemental service map.
3. Retrieve the public charging-map vector tiles covering the continental US, Canada (including the north), Alaska and Hawaii. Filter only `Rivian Adventure Network` and `Rivian Waypoints Network`.
4. Deduplicate station source IDs, refine each map pin at zoom 12, and normalize names, addresses, charger counts, maximum kW and vehicle access. Retain valid letter grades from `score`; omit `available` because there is no live stall-availability promise.
5. Validate both inventories together before applying them. Reject missing tiles, malformed data, duplicate identities/URLs, unexpectedly small inventories, or a per-network/directory count decline over 15%.
6. Generate every page, run tests, and audit production dependencies.
7. Commit only validated data/bundles/generated pages. A concurrent human push makes the normal fast-forward push fail; the workflow never force-pushes or rebases unseen code.
8. Upload and deploy the tested artifact in the same workflow. Bot pushes do not trigger another Actions workflow, so deployment is explicit.

The workflow and normal releases share a concurrency group; `cancel-in-progress: false` prevents interruption of a Pages deployment. A failure before upload leaves the last public release intact. If the data commit succeeds but Pages fails, the committed snapshot is retained and the last successful public site stays up; rerun the failed deployment job. GitHub's native failed-workflow notifications and Actions logs report failures to repository subscribers. No separate notification service is used.

Every build adds a deterministic data hash to the release cache version, so automatic data-only updates invalidate old bundled browser assets. JSON data is network-first with an offline fallback.

## Source limits and identity

The source is the public tile service used by `https://rivian.com/experience/charging#map`. It is a website implementation detail, not a guaranteed external API. Requests are throttled to at most one new request per second, honor rate-limit backoff, and have bounded retries/timeouts. Source limits can still reject that cadence. Expensive overview tiles may be subdivided; unresolved failures block publication. The job has a 100-minute ceiling, including a 60-minute budget for charging-detail requests.

Source IDs map to deterministic safe numeric IDs. Existing slugs and IDs survive station renames. Stations absent from a later complete snapshot retain their detail URL and saved-place identity but leave the default directory; their page says they are no longer listed, without claiming a closure. Charger pins are labeled internally `map-pin` rather than survey-accurate coordinates. Directions use a published address when present, falling back to the pin.

Nearby Rivian places within 0.15 miles cross-link as **Nearby**, without asserting shared parking/access or combining separate businesses. No connector type, pricing, hours, or availability is inferred from generic network claims.

## Recovery

Inspect the failed Actions step. A temporary source failure can be retried manually or will be retried by the next scheduled run. A source schema change or legitimate major inventory reduction requires an importer/guard update before unattended publication resumes. Do not bypass the validators by publishing partial data.

For local investigation, `node scripts/refresh-charging.mjs --cache-dir /tmp/spotter-charging-recovery` resumes a single interrupted snapshot. This cache must not be reused for a later day's refresh. Scheduled runs always use a fresh temporary cache.

## Rivian Roamer enrichment

The same daily workflow retrieves Roamer's public RAN network page once. It imports Rivian-assigned location grades, prices, connector counts, average peak power, source IDs/pins, and explicit site condition reports. No private endpoints, credentials, live stall counts, or inferred failures are used. `data/roamer.json` joins official stations by exact source ID; official specifications and coordinates remain authoritative. Newly detected source IDs are retained in snapshot history; map inventory continues to come from Rivian's official source.

Each daily run checks the union of network-listing IDs and every active official Rivian Adventure Network ID. An official site absent from the listing is requested directly at its public detail URL; the page identity must match before importing facts. Previously complete pages are fetched again every day. Each daily run works through all station detail pages, missing details first and then oldest observations, with 15 seconds between requests. These add rated port power, hours, amenities, idle fees, and individual connector/features. Each successful detail import is checkpointed. If the 60-minute budget expires or the source rate-limits requests, the next daily run resumes missing coverage first. A full 160-site pass takes about 40 minutes plus response time. The UI dates network and detail observations separately.

A 429 response stops requests immediately and persists a cooldown of at least 24 hours (or a longer Retry-After). A source error retains the previous facts; optional Roamer retrieval can fail without blocking valid official updates. Build, test and dependency audit failures always block publication. Network inventory loss over 15%, duplicate IDs, missing pins or incomplete cards are rejected. Grade, price, connector, explicit condition and detail changes are retained for 30 days (up to 200 events). A new source listing is not claimed as a newly opened station; an absent or unknown condition is not a charger outage.

The initial October 14 snapshot includes 160 network cards and 17 detail pages. A rate-limit response stopped further detail collection and established the first cooldown. Scheduled runs use a fresh temporary cache and resume missing detail coverage after that cooldown. For parser recovery only, `ROAMER_CACHE_DIR=/path/to/saved/html npm run refresh:roamer -- --cache-only` imports existing HTML without requesting the source.

Public map letter grades are the primary badge source; a supplemental rating is used only when the official station record has no valid grade. Public map records checked on October 14 expose count, maximum power, vehicle access and grade, but no pricing, hours, or individual ports.

The first grade backfill retains three individually verified October 14 records (East Greenwich, Tigard, and Mackinaw City). A bulk backfill stopped at HTTP 429 without publishing its partial inventory. Remaining official grades will arrive through a successful complete scheduled refresh; existing supplemental badges remain available in the meantime.

## Detail coverage and freshness

The Actions coverage report compares supplemental data against all active official Rivian Adventure Network sites, not just the supplemental listing. It reports successful checks in the latest pass separately from retained detail records, captures older than 36 hours, missing pages, and unavailable pricing/hours. Incomplete passes emit an Actions warning and identify missing/stale IDs. Retained facts keep their original capture timestamps. Cache-only recovery is identified separately and is not a fresh daily pass.

On October 15, the daily listing contained 160 sites while the official inventory contained 162. Direct public-page recovery filled Jacksonville and East Greenwich without repeating the other 160 requests. Both daily and recovery paths now include official-only IDs. Energy-only pricing is preserved as a general energy rate; it is not assigned to an unsupported vehicle category.

Daily captures are not real-time status. A page retrieval time and the source's own “Updated” text describe different events; neither implies that a vehicle can use a stall now. Future live availability needs its own refresh policy and upstream agreement, separate from these daily metadata checks.

## Coming-soon charging locations

The 5 AM Pacific official refresh also reads the charging page's explicit `coming-soon-chargers-source` layer. These announcements live in a referenced public JavaScript asset rather than the active-charger tiles. The map source name identifies the data independently of minified export names. Asset URLs are discovered from the page on every run; only the literal location data is parsed, and downloaded code is never executed. Missing or malformed source data stops the staged refresh without removing the prior inventory.

Each announced city has a stable local identity, a Coming Soon label, and an approximate city pin using Rivian's published coordinates. No address, opening date, charger count, speed, pricing, or directions is inferred. Planned records are excluded from supplemental detail requests, active-inventory loss checks, and nearby available-charging links. The map uses outlined markers and a wider city zoom. The first import contains 36 announced locations, including King City and Salinas, California.

A city-only announcement is not merged with an active site based solely on a shared city name: Rivian can list both, and these may be different locations. Disappearing announcements are reconciled using the transition rules below. Unmatched announcements retain their saved URL but leave normal results and say they are no longer listed as coming soon.


### Automatic transition to an active station

A removed announcement is matched to an active RAN station only when there is exactly one eligible new station in the same normalized city, state and country, within 10 km of the approximate pin. The active listing must have a published address and positive charger count, and its first observed date must be later than the announcement's first observed date. Existing stations, simultaneous first observations, multiple new candidates, distant pins and still-published announcements do not trigger a match. This is a conservative reconciliation heuristic, not an upstream identity assertion. Unresolved candidates and promotion evidence are recorded in `charging-summary.json` for maintainers, never as public verification warnings.

A matched station keeps the original announcement's ID, URL and first-seen date, adopts the official station source ID, address and coordinates, and joins existing supplemental details by exact source ID in the same build. Its newer active ID and URL remain aliases if already published. The identity association survives later refreshes and temporary source omissions. Source announcements that briefly reappear after a match do not create a duplicate. A station that remains ambiguous still imports normally as its own active listing; the retired announcement's URL is retained. Roamer-only discoveries do not establish official active inventory or bypass these matching requirements.

## Shared charging sites

The public model groups exactly one active Rivian Adventure Network listing and one Waypoint listing when their normalized published street address, city, state and country match and their map pins are within 0.15 miles. Ambiguous campuses, missing addresses, city-only announcements and merely nearby stations remain separate. Grouping is recalculated from current data at every build and browser load.

Canonical source records and source IDs stay separate, so the daily refresh continues checking each network independently. The shared listing retains separate charger counts, power, access and available supplemental data. The RAN identity is the public primary; Waypoint IDs and URLs remain aliases for saved places and existing links. Both category filters include shared sites. Supplemental prices stay with their source network and are never copied to another network. Time-of-use schedules are formatted at display time, leaving the captured source text intact.

## Public location change feed

`/updates.html` is the public location-change feed; website release history lives at `/changelog.html`. Before fetching, the refresh snapshots normalized location facts into the runner's temporary directory. After collection, `scripts/update-location-feed.cjs record` compares the snapshots and appends dated, deduplicated public entries to `data/location-updates.json`. Build, tests and audit must pass before data and feed are committed and deployed together. A failed refresh cannot publish a false no-change report. Incomplete supplemental checks retain prior facts and show a partial-coverage note.

`scripts/location-digest.cjs` is shared with the private daily email helper. Public entries use an explicit field allowlist and relative location URLs; no private email report or delivery state is copied. Map-pin and precision changes are excluded from the public feed, and pin-only changes produce no entry. New listings, coming-soon announcements, confirmed planned-to-open transitions, relistings, removed listings and substantive detail changes are retained. Connector ordering and observation timestamps are not changes. Recording dates do not assert opening dates or live charger availability.

The initial October 21 report was seeded from the verified daily digest, excluding pin changes. Later reports come directly from successful refreshes, regardless of email delivery. Existing entries persist when no changes are found. Tests cover pin suppression, event deduplication, status transitions, source escaping and private-field exclusion.
