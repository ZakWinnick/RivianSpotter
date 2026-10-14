# Safe operations implementation report

## Changes

- Replaced credential-based administrator pages with a static GitHub maintenance workflow and a canonical-data review queue.
- Removed every legacy `js/admin/` source, minified script, and source map. Replaced `js/admin.js` with safe text rendering and removal of known legacy storage keys.
- Replaced PHP administrator/configuration/contact routes with inert 410 retirement responses, removing token-query authentication, writes, and email sending.
- Added release 2026.42.4 same-origin allowlist caching, network-first public navigations/data, bounded runtime caches, old-cache removal, and a real shared-style offline page.
- Replaced permissive CI with blocking Node tests, static build, and production dependency audit, followed by a least-permission `dist/` Pages deployment for successful main runs.
- Documented canonical editing, local checks, Pages prerequisites, offline limits, retirement behavior, and rollback.

## Verification

The initial nine operation checks were written and run before implementation; all nine failed against the old behavior. Seven additional failing checks covered shared header/footer integration, local branding/vendor cache paths, denied cache storage, fresh install requests, version-specific asset keys, denied offline cache reads, and private install responses. Final `node --test tests/operations.test.cjs`: 16 passed, zero failures. The precache existence check confirms all ten shell assets exist. `node --check service-worker.js` and `node --check js/admin.js` also pass. PHP is not installed in this local environment, so runtime PHP checks were not performed.

## Boundaries

No commit, deployment, remote write, repository-setting update, or credential revocation was performed by this worker. Tests simulate the service-worker environment; an actual old-worker browser upgrade and Apache/PHP HTTP check remain unverified here. PHP stubs are excluded from supported static hosting, where retired endpoint URLs may return 404. Source deletion does not rewrite historical Git objects. The parent owns full build/dependency/browser verification.

## Upgrade repair

The parent browser check exposed stale shell responses entering a new worker cache via ordinary HTTP-cache retrieval. Installation now bypasses that cache with explicit reload requests, stores current JS/CSS version keys, and refuses private responses. Asset cache keys retain their version. Network-first fallback handles cache-storage denial with an explicit 503 instead of rejecting the response. The parent owns the actual repaired browser-upgrade rerun.
