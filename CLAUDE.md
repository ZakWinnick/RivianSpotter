# Repository guidance

Read `README.md`, `PRODUCT.md`, `DESIGN.md`, and `docs/LOCATION_DATA.md` for the maintained architecture and data rules.

This is a vanilla HTML/CSS/JavaScript static site. Run `npm ci`, `npm test`, `npm run build`, then `node scripts/serve.cjs`. Always preview `dist`, never the repository root. GitHub Actions publishes `dist` on main after checks pass.

`data/locations.json` is canonical. Preserve stable IDs and aliases, separate general/service availability, cite official sources, and never invent coordinates or turn unknown hours into open/closed claims. `js/locations.js` and information/destination pages are generated.

The browser never stores repository write credentials. The administration page routes maintenance to authenticated GitHub editing. PHP mutation routes are retired.

Tests use Node's built-in runner against production logic and canonical data. Browser checks must cover responsive Map/List, theme, keyboard/focus, saved places, deep links and the old-cache upgrade. Keep the build asset version and service-worker release in sync for changes to shell assets.
