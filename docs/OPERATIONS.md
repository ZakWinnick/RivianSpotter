# RivianSpotter operations

Release: 2026.42.19 (plus a deterministic data hash). Supported hosting is a static GitHub Pages build of `dist/`.

## Inventory changes

`data/locations.json` is authoritative. `js/locations.js` and destination pages are generated, so edit the canonical inventory rather than those outputs. Read `docs/LOCATION_DATA.md` for the record schema, official-source refresh workflow, and evidence rules.

Open `/admin` to continue directly to GitHub’s authenticated inventory editor. The extensionless, trailing-slash, `.html`, and legacy `admin-new` routes provide the same fixed handoff. No maintenance instructions, review queue, inventory editor, or browser credential form is published on these routes. GitHub enforces sign-in and repository write permissions; the public static redirect is not itself an authentication boundary. Propose changes in a pull request, preserve established IDs, record sources, and keep unknown details empty. Use a GitHub account with the appropriate repository permissions on GitHub itself.

Corrections from visitors prepare an email in their email app. They must review and send the message themselves; the site does not claim to submit it, retain it, or send an automatic acknowledgement.

## Local checks and release

1. Install locked dependencies with `npm ci`.
2. Run `node --test tests/*.test.cjs`.
3. Run `npm run build` and inspect the generated public routes in `dist/`.
4. Run `npm audit --omit=dev`.
5. Review the inventory diff, source coverage, generated pages, mobile finder, saved places, keyboard behavior, and offline recovery.

The checked-in GitHub Actions workflow runs these tests, the build, and the production dependency audit without ignoring failures. Pull requests and `develop` validate only. A successful push or manually dispatched run on `main` uploads `dist/` and deploys that artifact to GitHub Pages. Repository Pages settings must use GitHub Actions; an environment protection rule may require a repository maintainer to approve deployment. These repository settings are outside this local implementation.

Ordinary validation jobs have read-only repository permissions and do not persist checkout credentials. The scheduled refresh job has scoped repository write permission to commit validated data. Only the deployment job receives `pages: write` and `id-token: write`. No personal access token, server upload credential, or Codecov secret is needed. Never publish the entire source checkout; the build should include only intended static assets, generated pages, and public data, excluding PHP, private configuration, tests, tools, source maps, and historical admin code.

After publication, check the real public finder, a generated destination page, canonical data, and the service worker. A passing local build or Actions run does not establish that the public release is live.

## Offline behavior

`service-worker.js` uses the version prefix `rivianspotter-2026.42.19-<data hash>`. Navigation and canonical data use network-first retrieval: successful network content is returned, and previously cached content is available after a connection failure. The shell includes a real `/offline.html` fallback for unvisited public pages. Installation explicitly fetches every shell asset with `cache: 'reload'` to prevent an older browser HTTP-cache response from entering the new release cache. JavaScript/CSS requests carry the current `?v=2026.42.19-<data hash>` version. Static shell assets use the release cache; increment the package release for shell changes; data changes automatically alter the build hash.

Caches are restricted to allowlisted same-origin public GET paths. They do not store administrator pages, PHP/API routes, arbitrary private pages, non-GET requests, authenticated requests, external map responses, opaque responses, redirects, or responses marked `private`/`no-store`. Unknown query parameter names bypass caching; permitted finder query strings share the static page's cache key, limiting duplication. Asset cache keys preserve the `v` version parameter, so different releases cannot share an asset key. Generated destination and regional pages use lowercase slug routes.

The shell contains twelve source assets and at most twenty-one cache entries including unversioned compatibility aliases (a 24-entry bound). The project logo is included; pinned local Mapbox vendor scripts/styles are eligible for runtime asset caching. Runtime pages are limited to 40 entries, public data to six, and other public assets to 40. Known responses larger than 2 MiB are excluded from runtime caching. When offline, cached place facts are last-known details; current opening hours, map resources, directions, and official booking destinations require a connection. No queued writes, administrator background sync, or arbitrary URL-cache command exists.

Activation deletes previous `rivianspotter-` cache versions, including the old map/admin/API caches, while preserving caches with unrelated names. To test an upgrade, install the previous worker, visit public pages, release the new worker, wait for activation, verify that old cache names disappear, then test a visited page and an unvisited destination offline. Repeat with denied cache storage and check that a valid network result still appears. Automated tests exercise the worker's actual policy and lifecycle in a simulated service-worker environment; a browser upgrade check remains part of release verification.

## Retired server paths

The old `api/*.php` and `contact-handler.php` files are inert retirement stubs: they respond with HTTP 410 and `Cache-Control: no-store` on a PHP host, without loading configuration, authenticating, writing, or sending email. GitHub Pages does not execute PHP and the static build excludes these files, so old endpoint requests there may return 404. Clients must load `/data/locations.json` instead.

Legacy `js/admin/` scripts and generated maps were removed. The admin handoff script removes known legacy credential storage keys from local/session storage without reading their values. Existing browser credentials remain outside repository control until that device loads the maintenance page or clears site storage; repository maintainers can revoke any former access credentials on their issuing service. Historical Git commits are not rewritten by this change.

`.htaccess` is only a defensive configuration for an optional Apache mirror. It is not used by GitHub Pages. Apache copies should publish `dist/`; the rules retire the old endpoints, deny hidden and tooling files, and avoid long-lived caching of mutable HTML/data/scripts.

## Rollback

Rebuild and publish a previously reviewed static release through the same blocking checks. Update the service-worker version when changing cached shell assets. Keep the static maintenance workflow and retired endpoints; restoring the credential-based administrator interface is not a supported rollback. Reopen the exact public pages after a rollback to confirm deployment propagation.

## 2026.42.5 correction

- Public views use Rivian's published facts without verification flags, review queues, or internal source-conflict notes. Missing schedules remain empty rather than invented.
- Keep extraction provenance (`sourceUrl`) separate from visitor destinations (`rivianUrl`). Supplemental service-map records have no individual page URL; the UI links to `https://rivian.com/experience/service#map` as “Rivian Service Centers.” Never reuse the Calgary extraction page as another place's page or structured `sameAs` value.
- All 116 directory page URLs were compared with the live official directory on October 14; each returned HTTP 200 with its expected final URL and canonical URL. All 39 supplemental records use the shared service-center destination.
- Closing a location restores the camera position from before selection, including after switching locations. Reduced-motion preferences skip animation.
- Validation: 51 behavioral tests, 210 generated HTML pages with resolved internal links, and no production dependency vulnerabilities. Browser checks cover corrected links, absent public warnings, and camera restoration.

## 2026.42.6 admin entry

Public admin entry pages now immediately continue to GitHub’s editor. The browser script clears retired credential keys before redirecting. A meta refresh and a plain link provide fallbacks when scripting is disabled. All admin aliases bypass service-worker caching. No private administration content is served by GitHub Pages.


## Unattended refresh

See [automatic refresh](AUTOMATIC_REFRESH.md) for the daily GitHub schedule, validation gates, bot commits and same-workflow deployment. Both place and charging inventories must pass before a refreshed release publishes.

## 2026.42.9 map overview correction

Closing a mapped location now returns to the full initial overview, even when the visitor previously zoomed into a cluster or region. The close action clears bearing, pitch, and detail offsets while retaining filters. Mobile uses a wider overview. Reduced-motion preferences skip animation. This supersedes the pre-selection camera restoration described in the historical 2026.42.5 release.

Validation: 58 behavioral tests, including regional browsing, switching locations, map-pin charging coordinates, mobile overview, repeated close, and reduced motion.

## 2026.42.10 explorer and charging enrichment

The explorer now separates Charging and Rivian Places, with six category cards, distinct map symbols, and details in the sidebar. Full Overview and closing details restore the complete map. Outpost pins use the official directions links and are retained during refresh only while their address and directions link still match.

Roamer public-page snapshots enrich matching official RAN stations with pricing, connector counts, Rivian-assigned grades and observed average peak power. Rotating detail snapshots add hours, idle fees, amenities and individual ports. Explicit maintenance/downtime reports show the observation date; normal operating status and live availability are omitted. The daily schedule and conservative request limits are documented in AUTOMATIC_REFRESH.md.

## 2026.42.12 map popups and site changelog

Location details float over the map again; the sidebar remains available for browsing. Mobile selection opens the map with a scrollable popup. The camera offsets the selected pin away from the popup, and closing restores the full overview. The location finder uses a crosshairs icon with an accessible name and tooltip, without a visible text label.

The Updates page renders curated product changes from `data/site-changelog.json`. Group related improvements into concise release summaries; avoid separate entries for each small iteration. Daily inventory changes and charger condition reports do not generate changelog entries; location details still show dated issue reports.

## 2026.42.13 popup close control and analytics

The popup's header and close control remain sticky while its details scroll, on desktop and mobile. Public explorer and generated pages include the original Tinylytics embed jj-9YE1ymyozj9wFfy7d. Analytics is excluded from the service-worker allowlist and the fixed admin handoff routes.

Historical releases 2026.06, 2025.52, and 2025.44 were migrated from the original About-page changelog. Preserve those entries when consolidating newer releases. They retain their original version labels without inferred publication dates.

## RAN detail coverage and mobile return view

The daily job runs at 19:23 UTC. It requests the network page once, then visits station detail pages sequentially with 15 seconds between requests. Missing details have priority, followed by oldest snapshots. Each successful import is checkpointed; a 45-minute importer budget leaves time to validate and publish in the 75-minute workflow. A rate limit stops requests immediately and preserves a cooldown of at least 24 hours (or longer Retry-After). Subsequent daily runs resume missing coverage. Workflow summaries report coverage; full data is not claimed while sites remain missing. Source-unlisted sites retain official data without fabricated individual chargers.

RAN cards share connectors, pricing, average peak power, hours, idle fees, site features, and individual charger sections. Unknown values are explicit rather than inferred. Mobile popup close returns to the originating list/map view; the URL retains that originating view while a popup is open.
