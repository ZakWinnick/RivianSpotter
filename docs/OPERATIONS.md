# RivianSpotter operations

Release: 2026.42.3. Supported hosting is a static GitHub Pages build of `dist/`.

## Inventory changes

`data/locations.json` is authoritative. `js/locations.js` and destination pages are generated, so edit the canonical inventory rather than those outputs. Read `docs/LOCATION_DATA.md` for the record schema, official-source refresh workflow, and evidence rules.

Open `/admin.html` to find the review queue and GitHub's authenticated inventory editor. The maintenance page has no login, repository write client, or browser credentials. Propose changes in a pull request, preserve established IDs, record sources, and keep unknown details empty. Use a GitHub account with the appropriate repository permissions on GitHub itself.

Corrections from visitors prepare an email in their email app. They must review and send the message themselves; the site does not claim to submit it, retain it, or send an automatic acknowledgement.

## Local checks and release

1. Install locked dependencies with `npm ci`.
2. Run `node --test tests/*.test.cjs`.
3. Run `npm run build` and inspect the generated public routes in `dist/`.
4. Run `npm audit --omit=dev`.
5. Review the inventory diff, source coverage, generated pages, mobile finder, saved places, keyboard behavior, and offline recovery.

The checked-in GitHub Actions workflow runs these tests, the build, and the production dependency audit without ignoring failures. Pull requests and `develop` validate only. A successful push or manually dispatched run on `main` uploads `dist/` and deploys that artifact to GitHub Pages. Repository Pages settings must use GitHub Actions; an environment protection rule may require a repository maintainer to approve deployment. These repository settings are outside this local implementation.

Build jobs have read-only repository permissions and do not persist checkout credentials. Only the deployment job receives `pages: write` and `id-token: write`. No personal access token, server upload credential, or Codecov secret is needed. Never publish the entire source checkout; the build should include only intended static assets, generated pages, and public data, excluding PHP, private configuration, tests, tools, source maps, and historical admin code.

After publication, check the real public finder, a generated destination page, canonical data, and the service worker. A passing local build or Actions run does not establish that the public release is live.

## Offline behavior

`service-worker.js` uses the version prefix `rivianspotter-2026.42.3`. Navigation and canonical data use network-first retrieval: successful network content is returned, and previously cached content is available after a connection failure. The shell includes a real `/offline.html` fallback for unvisited public pages. Installation explicitly fetches every shell asset with `cache: 'reload'` to prevent an older browser HTTP-cache response from entering the new release cache. JavaScript/CSS requests carry the current `?v=2026.42.3` version. Static shell assets use the release cache; increment the release prefix and build asset version when changing these files.

Caches are restricted to allowlisted same-origin public GET paths. They do not store administrator pages, PHP/API routes, arbitrary private pages, non-GET requests, authenticated requests, external map responses, opaque responses, redirects, or responses marked `private`/`no-store`. Unknown query parameter names bypass caching; permitted finder query strings share the static page's cache key, limiting duplication. Asset cache keys preserve the `v` version parameter, so different releases cannot share an asset key. Generated destination and regional pages use lowercase slug routes.

The shell contains ten source assets and at most seventeen cache entries including unversioned compatibility aliases (a 24-entry bound). The project logo is included; pinned local Mapbox vendor scripts/styles are eligible for runtime asset caching. Runtime pages are limited to 40 entries, public data to four, and other public assets to 40. Known responses larger than 2 MiB are excluded from runtime caching. When offline, cached place facts are last-known details; current opening hours, map resources, directions, and official booking destinations require a connection. No queued writes, administrator background sync, or arbitrary URL-cache command exists.

Activation deletes previous `rivianspotter-` cache versions, including the old map/admin/API caches, while preserving caches with unrelated names. To test an upgrade, install the previous worker, visit public pages, release the new worker, wait for activation, verify that old cache names disappear, then test a visited page and an unvisited destination offline. Repeat with denied cache storage and check that a valid network result still appears. Automated tests exercise the worker's actual policy and lifecycle in a simulated service-worker environment; a browser upgrade check remains part of release verification.

## Retired server paths

The old `api/*.php` and `contact-handler.php` files are inert retirement stubs: they respond with HTTP 410 and `Cache-Control: no-store` on a PHP host, without loading configuration, authenticating, writing, or sending email. GitHub Pages does not execute PHP and the static build excludes these files, so old endpoint requests there may return 404. Clients must load `/data/locations.json` instead.

Legacy `js/admin/` scripts and generated maps were removed. The new maintenance script removes known legacy credential storage keys from local/session storage without reading their values. Existing browser credentials remain outside repository control until that device loads the maintenance page or clears site storage; repository maintainers can revoke any former access credentials on their issuing service. Historical Git commits are not rewritten by this change.

`.htaccess` is only a defensive configuration for an optional Apache mirror. It is not used by GitHub Pages. Apache copies should publish `dist/`; the rules retire the old endpoints, deny hidden and tooling files, and avoid long-lived caching of mutable HTML/data/scripts.

## Rollback

Rebuild and publish a previously reviewed static release through the same blocking checks. Update the service-worker version when changing cached shell assets. Keep the static maintenance workflow and retired endpoints; restoring the credential-based administrator interface is not a supported rollback. Reopen the exact public pages after a rollback to confirm deployment propagation.
