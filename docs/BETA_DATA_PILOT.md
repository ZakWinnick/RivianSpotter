# Beta JSON directory and design releases

The beta directory reads its public location facts from one validated JSON snapshot. The map, location gallery, location and region pages, directory statistics, location updates, and changelog render in the browser. `dynamic.html` is a reusable design shell; there is no generated HTML file for each location. The beta edge Worker serves that shell at valid paths and checks the current route index before returning a real 404 for an unknown location or region.

The web snapshot has its own SHA-256 identity covering all public fields, including updates and changelog. This identity can change when the iOS catalog revision does not. The browser verifies the identity, keeps the last valid snapshot in IndexedDB, and checks again on focus and every five minutes while visible. It delays a page update while someone is interacting with that view. An unavailable or invalid update does not overwrite the last good snapshot. Data is not live charger availability.

## Daily publishing

The existing refresh collects and validates source data once. With both `BETA_DATA_PUBLISH_ENABLED` and `BETA_DYNAMIC_RENDER_ENABLED` set to `true`, the beta publisher uses that validated data and production catalog to build an archive containing only:

- `api/v1/catalog.json`, byte-identical to the validated production v1 catalog;
- `data/beta-bundle.json`, the shared web snapshot;
- `data/beta-routes.json`, the route index for the Worker; and
- `sitemap.xml`.

It does not check out or build the beta design and does not upload HTML, JavaScript, CSS, vendor assets, or images. A failed validation or upload must leave the last successful beta data deployment in place. The independent production and GitHub Pages publication paths remain unchanged.

## Beta design releases

The `beta-main` source branch sends its exact commit SHA to the trusted main-ref `Release beta design` workflow. The workflow checks that the requested SHA is still the branch head and builds the previous and next designs without AWS credentials. The deployment job uses the existing narrowly scoped main-ref OIDC role and targets the beta shell branch only. `beta-release.json` on that shell records the deployed design SHA. Both the previous and next design assets are retained under immutable `/beta-releases/<sha>/...` paths during a design transition; generated data pages are not published.

The dynamic design build must not invoke `buildPages` or create per-location HTML. `BETA_DYNAMIC_RENDER_ENABLED=true` enables the JSON workflow and dynamic design release after the edge Worker has been configured for dynamic mode. If that flag is unset, the legacy beta data publisher remains selected, so coordinate the Worker mode and flag before changing either. The direct beta-data origin must have a valid route index before enabling dynamic mode.

## Verification and rollback

For a release or recovery, verify the beta shell, dynamic location and legacy alias links, an unknown-location 404, map, gallery, Browse, stats, updates, changelog, saved state, service-worker activation and offline last-known-good behavior. Verify the same-host v1 catalog is JSON and matches production bytes; a conditional request should return an appropriate validator response. Check production remains unchanged. Test changing source data with the shell held fixed, including a change affecting only the web snapshot.

The Worker supports explicit legacy and dynamic modes. Restore the previously verified shell/data deployment and switch routing and workflow flags together when rolling back; do not point installed iOS clients to an older catalog revision. If old catalog content must be restored, publish it with a new monotonically increasing v1 revision. Keep prior releases available for recovery.

Location pages no longer carry individual server-rendered metadata or structured data in the initial HTML. The browser sets title, canonical URL and basic structured data after loading; crawlers and social preview tools that do not execute JavaScript may not see location-specific content. The sitemap and real 404s remain available, but they do not replace server-rendered previews.
