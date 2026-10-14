# Deployment

GitHub Pages serves the `dist` artifact produced by `.github/workflows/test.yml`. Pages must use GitHub Actions as its build source. The CNAME remains `rivianspotter.com`.

Pull requests run tests, build and production dependency audit. A successful push to `main` deploys with `pages: write` and `id-token: write` scoped to the deployment job. Build permissions are read-only.

Before releasing: run `npm test`, `npm run build`, and `npm audit --omit=dev`; check desktop/mobile finder flows and exact changed destination pages. After releasing, reopen the public site and confirm deployed data/date, styles, old-cache upgrade, source links, and at least one destination route.

Rollback by reverting the release commit, advancing the service worker/build release stamp, and allowing the same workflow to deploy. Never revert to a release containing browser-stored write credentials.

See `docs/OPERATIONS.md` for cache and maintenance boundaries.
