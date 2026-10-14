# RivianSpotter Explorer Overhaul Implementation Plan

> Execute with superpowers:subagent-driven-development. The user approved the full audit and map-first design, plus a complete refresh from Rivian's official directory. Continue through implementation and verification without another planning approval.

**Goal:** Deliver an accessible, trustworthy location explorer, current official inventory, readable destination pages, and a maintainable static deployment.

**Architecture:** Canonical JSON generates the browser dataset and crawlable location pages. Small vanilla-JavaScript modules handle pure location logic, map integration, and explorer interaction. GitHub Pages builds and publishes a dist artifact; public browsers never hold repository write credentials.

**Tech stack:** HTML, CSS, JavaScript, Mapbox GL, Node build/tests, GitHub Pages.

## Global constraints
- Preserve existing location IDs where records match; add new IDs without collisions.
- Source current location facts from https://rivian.com/spaces/locations and its linked official pages. Record evidence and uncertainty; do not invent photographs, addresses, closures, hours, or verification dates.
- data/locations.json is the authoritative array. js/locations.js is generated.
- No new customer accounts or persistent browser administrator credentials.
- Scope includes desktop/mobile finder, details, saved places, share URLs, intent filters, updates, location pages, accessibility, caching, admin safety, and operational documentation.
- Support map failure, denied location, empty results, invalid deep links, and storage failure.
- User-approved design: warm light surfaces, charcoal/forest palette, restrained yellow, compact finder before content.

## Task 1: Official inventory refresh
Owner: data worker. Files: data/locations.json, data/refresh-summary.json, data/location-history.json, scripts/refresh-locations.cjs, scripts/generate-data.cjs, tests/data-refresh.test.cjs, docs/LOCATION_DATA.md, js/locations.js.
- [x] Capture the complete official directory, not just first visible listings. Reconcile legacy records by official slug/address and preserve IDs.
- [x] For confirmed listings store id, slug, name, type, state, country, address, city, lat/lng (nullable), coordinatePrecision, timezone, hours, serviceHours, phone, services, capabilities, status, rivianUrl, bookingUrl, sourceUrl, lastVerified, verificationStatus, notes, hoursExceptions. Preserve unresolved legacy records with needs-review status and no unverified claims promoted to fact.
- [x] Record additions, changes, and unmatched legacy records in the summary/history. Add a repeatable fetch/reconcile script with parse-completeness checks.
- [x] Generate browser data deterministically and test canonical/generated equality, stable IDs, no invented coordinates, directory coverage, and safe URLs.

## Task 2: Pure domain behavior
Owner: parent. Files: js/location-model.js, tests/location-model.test.cjs.
- [x] Write failing tests for location-local schedules, service/general separation, overnight hours, malformed/unknown hours, closed/planned states, search/filter combinations, precision-aware directions, safe URLs, and date-only formatting.
- [x] Implement exported browser/CommonJS functions: getHoursState(location, date, mode), filterLocations(locations, filters), getDirectionsUrl(location), distanceMiles(a,b), formatDate(value), safeUrl(value), locationUrl(location).
- [x] Run tests and fix every failure before integration.

## Task 3: Public explorer and pages
Owner: parent. Files: index.html, css/style.css, js/app.js, js/map.js, js/components.js, js/features.js, about.html, contact.html, stats.html, updates.html, saved.html, scripts/build-pages.cjs, build.js, manifest.json.
- [x] Implement semantic search/results/map/detail flow, shared nav/footer, theme selection, true mobile Map/List modes, filters, saved places, geolocation and distance sorting, bounds search, recovery, URL state, and keyboard/focus handling.
- [x] Generate crawlable location and regional pages, sitemap, metadata, and authentic source-linked practical content.
- [x] Add correction forms that prepare an email to support@rivianspotter.com with the specific place and correction, without sending automatically.
- [x] Build complete dist output and validate route/asset links.

## Task 4: Safe operations
Owner: operations worker. Files: admin.html, admin-new.html, js/admin/*, js/admin.js, api/*, contact-handler.php, service-worker.js, .github/workflows/*, .htaccess, tests/operations.test.cjs, docs/OPERATIONS.md.
- [x] Remove browser-token admin flows. Provide a static maintenance page linking to authenticated GitHub editing of canonical JSON and the location review queue.
- [x] Retire obsolete PHP mutation endpoints safely; retain read-only location response if appropriate. Remove query-token and obsolete contact handlers.
- [x] Implement network-first navigation/data with versioned safe offline fallback and bounded caching. No admin/API write caching.
- [x] Configure CI to run node --test tests/*.test.cjs, npm run build, and npm audit --omit=dev; failures must block. Deploy dist on main via GitHub Pages with least privileges.
- [x] Tests cover retired credential paths, precache files, cache boundaries, and CI/build contract. No deployment or remote writes by worker.

## Task 5: Integration and release verification
Owner: parent plus independent reviewer.
- [x] Update README, build/deployment/testing docs and changelog to describe the final supported static architecture.
- [x] Run full tests, production build, generated-data and route validation, dependency audit, and a source review.
- [x] Browser-check narrow phone, tablet, desktop, both themes, keyboard selection, filters, deep links, saved places, directions, corrections, empty results, map failure, and old-service-worker upgrade where available.
- [x] Complete a critique/fix pass and capture screenshots. Fix material review findings, then verify public deployment only after publishing is authorized and possible. Report local/committed/live boundaries accurately.
