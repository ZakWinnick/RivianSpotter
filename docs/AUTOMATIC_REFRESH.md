# Automatic official-data refresh

The `Refresh official location and charging data` GitHub Actions workflow runs daily at **13:23 UTC** (6:23 AM Pacific during daylight saving time, 5:23 AM in winter). It can also be run manually from Actions. No personal access token, external scheduler, or manual approval is required.

## Lifecycle

1. Check out current `main` and install pinned dependencies.
2. Retrieve Rivian's official location directory, each location detail page, and supplemental service map.
3. Retrieve the public charging-map vector tiles covering the continental US, Canada (including the north), Alaska and Hawaii. Filter only `Rivian Adventure Network` and `Rivian Waypoints Network`.
4. Deduplicate station source IDs, refine each map pin at zoom 12, and normalize names, addresses, charger counts, maximum kW and vehicle access. Drop `available` and `score`: there is no live stall-availability promise.
5. Validate both inventories together before applying them. Reject missing tiles, malformed data, duplicate identities/URLs, unexpectedly small inventories, or a per-network/directory count decline over 15%.
6. Generate every page, run tests, and audit production dependencies.
7. Commit only validated data/bundles/generated pages. A concurrent human push makes the normal fast-forward push fail; the workflow never force-pushes or rebases unseen code.
8. Upload and deploy the tested artifact in the same workflow. Bot pushes do not trigger another Actions workflow, so deployment is explicit.

The workflow and normal releases share a concurrency group; `cancel-in-progress: false` prevents interruption of a Pages deployment. A failure before upload leaves the last public release intact. If the data commit succeeds but Pages fails, the committed snapshot is retained and the last successful public site stays up; rerun the failed deployment job. GitHub's native failed-workflow notifications and Actions logs report failures to repository subscribers. No separate notification service is used.

Every build adds a deterministic data hash to the release cache version, so automatic data-only updates invalidate old bundled browser assets. JSON data is network-first with an offline fallback.

## Source limits and identity

The source is the public tile service used by `https://rivian.com/experience/charging#map`. It is a website implementation detail, not a guaranteed external API. Requests are throttled below its observed five-per-second limit, honor rate-limit backoff, and have bounded retries/timeouts. Expensive overview tiles may be subdivided; unresolved failures block publication. The job has a 45-minute ceiling.

Source IDs map to deterministic safe numeric IDs. Existing slugs and IDs survive station renames. Stations absent from a later complete snapshot retain their detail URL and saved-place identity but leave the default directory; their page says they are no longer listed, without claiming a closure. Charger pins are labeled internally `map-pin` rather than survey-accurate coordinates. Directions use a published address when present, falling back to the pin.

Nearby Rivian places within 0.15 miles cross-link as **Nearby**, without asserting shared parking/access or combining separate businesses. No connector type, pricing, hours, or availability is inferred from generic network claims.

## Recovery

Inspect the failed Actions step. A temporary source failure can be retried manually or will be retried by the next scheduled run. A source schema change or legitimate major inventory reduction requires an importer/guard update before unattended publication resumes. Do not bypass the validators by publishing partial data.

For local investigation, `node scripts/refresh-charging.mjs --cache-dir /tmp/spotter-charging-recovery` resumes a single interrupted snapshot. This cache must not be reused for a later day's refresh. Scheduled runs always use a fresh temporary cache.
