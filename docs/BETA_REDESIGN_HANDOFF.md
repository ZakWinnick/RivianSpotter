# RivSpotter beta redesign: handoff for deployment

Written November 18, 2026 for whoever handles RivSpotter deployment. It covers how the website redesign is organized in git, what it changes, how it reaches the beta site today, and what still needs attention.

## Summary

- Production is `main`. Every push to `main` publishes rivspotter.com through GitHub Pages and deploys the same build to Amplify **staging**. This is unchanged by the redesign.
- The redesign lives on **`beta-main`**. That is the working branch for the redesign from now on. Claude's new work lands there as commits on top of it.
- The beta site (Amplify **beta**) is built by `.github/workflows/deploy-beta.yml` from a **pinned commit**, using the data that `main` just validated. It never builds from `main`'s code.
- **Action needed:** the pin is `6f7f9ff`, which is missing the header update (`89c6a46`). Beta will not show the new full menu until the pin moves, or the workflow builds `beta-main` directly (recommended, see below).

## Branches

| Branch | Commit | Status |
|---|---|---|
| `main` | `fe06644` | Production. Includes PR #82 (beta isolation) and an accidental commit (see Cleanup). |
| `beta-main` | `89c6a46` | **Working branch for the redesign.** `main` at `2f4e6fb` plus the two redesign commits. |
| `beta-design` | `89c6a46` | Same commit as `beta-main`. Can be deleted once everyone uses `beta-main`. |
| `claude/app-look-redesign` | `6f7f9ff` | Old, first redesign commit only. Can be deleted. |
| `codex/beta-data-snapshots` | `38903af` | Separate beta data pilot, not part of the redesign. |

The two redesign commits:

1. `6f7f9ff` Redesign the website to match the iOS app
2. `89c6a46` Show every page in the website header

`beta-main` is behind `main` by PR #82 and the merge commit. That's expected: the deploy workflows only matter on `main`.

## How beta gets built today (from PR #82)

On a push to `main`, and after the nightly data refresh on `main`:

1. `main` builds and tests. Its validated `data/` folder is uploaded as the artifact `validated-beta-data`, and its full site zip as `validated-aws-site`.
2. `main`'s build deploys to Amplify **staging** only (`scripts/deploy-amplify.cjs <zip> staging`).
3. `deploy-beta.yml` checks out the **pinned redesign commit**, replaces its `data/` with `validated-beta-data`, runs `npm test && npm run build`, checks that `dist/api/v1/catalog.json` byte-matches production's catalog, and deploys that zip to Amplify **beta** only.

Consequences:

- Beta always carries the same location data as production, so it needs no refresh job of its own.
- Beta only changes when `main` runs (a push or the nightly refresh). Pushing to `beta-main` alone does not deploy beta.
- Beta shows exactly the pinned commit, not the branch tip.

## Recommended change

In `deploy-beta.yml`, check out `beta-main` instead of a SHA:

```yaml
      - name: Checkout the beta redesign branch
        uses: actions/checkout@v4
        with:
          ref: beta-main
          persist-credentials: false
```

Optionally add `workflow_dispatch` (or a `push` trigger on `beta-main` that reuses the latest `validated-beta-data` artifact from `main`) so a redesign change can reach beta without waiting for a push to `main` or the nightly refresh.

If you keep the pin instead, update it to `89c6a46` now and move it each time `beta-main` gets new commits.

## Cleanup

- Commit `5dad8c2` ("Beta Menu Update") on `main` added a `claude-export/` folder (a git bundle and two patch files, about 3,200 lines). These were transfer files and shouldn't be in the repo. They aren't deployed (the build copies only listed files), so production is unaffected, but they should be removed from `main` in a normal commit.
- Delete `beta-design` and `claude/app-look-redesign` once `beta-main` is confirmed as the single redesign branch.

## What the redesign changes

The site now uses the iOS app's visual language: grouped grey background, white rounded cards, system type, forest accent, and the per-type colors. Light and dark mode still follow the device setting.

**Navigation (`js/components.js`)**

- The four app tabs: Locations (`/locations/`), Map (`/`), Saved (`/saved.html`), Browse (`/regions/`).
- Desktop also lists Updates, Location data, Changelog, About and Report an update in a second bar. Tablets keep Updates and About inline and put the rest under More. Phones show a bottom tab bar with More as a fifth tab.
- `header("Explore")` still marks the Map tab, so older callers keep working.

**Map home (`index.html`, `js/app.js`, `js/map.js`)**

- The map is the default view on every screen size. On phones, `view=list` is now the explicit choice; `view=map` is still accepted.
- Desktop: the finder panel (`#finder`) floats over a full-window map. `map.setPadding` keeps the camera framed beside the panel.
- Markers draw the type symbols as images (`addTypeIcons`) instead of text glyphs. Clusters are neutral grey.
- All existing element IDs and behaviors are kept.

**New and rebuilt pages (`scripts/build-pages.cjs`)**

- `/locations/`: All Locations photo gallery with search and type filters (`js/gallery.js`).
- `/regions/`: now the Browse hub (types, states and provinces, secondary pages).
- Location pages: photo, title, type pill and services on the left; address, directions, links, Save/Share/Report and the record on the right. One column on phones.
- Page titles are plain ("Saved", "About", "Browse"). Eyebrow labels are gone.

**Photos**

- Location pages and the gallery use `data/location-photos.json` with the same rules as the iOS catalog. Rivian Adventure Network and Waypoint places without their own photo use the site's category photos, labeled "Category photo".
- **Release blocker for production:** `location-photos.json` notes that public rights to third-party photos (Rivian, PlugShare, Loc8NearMe) are not confirmed. Fine for beta, but this must be settled before the redesign merges to `main`.

**Release plumbing**

- Version `2026.47.0` in `package.json`, `package-lock.json` and `service-worker.js`.
- The service worker caches `/locations/`, `/js/gallery.js` and `/assets/spotter-app-mark.png`.
- New asset: `assets/spotter-app-mark.png` (the iOS app mark).

**Tests**

- `npm test`: 176 passing on `beta-main`, including `tests/redesign.test.cjs` (header tabs and page links, gallery and Browse pages).
- `tests/map-navigation.test.cjs` is unchanged; detail offsets still match.

## Merging to production later

When the redesign is approved for rivspotter.com:

1. Resolve the photo rights question above.
2. Merge `main` into `beta-main` first. Expect conflicts in the committed generated pages (`about.html`, `updates.html`, `saved.html`, `stats.html`, `changelog.html`, `404.html`, `contact.html`, `privacy.html`) and the version stamps. Resolve by taking `beta-main`'s code, then run `npm run build` to regenerate them, then `npm test`.
3. Bump the version past whatever `main` is on, in all three places.
4. Add a `data/site-changelog.json` entry for the redesign (none exists yet).
5. Merge to `main`. After that, beta and production are the same until the next beta-only change.

## Working agreement

- Claude can't push to GitHub from its environment. Claude's changes arrive as commits on top of `beta-main`, delivered as a git bundle or patch for Zak to push.
- Deployment and workflow changes are handled on the ChatGPT side. Claude won't change `.github/workflows/` unless asked.
