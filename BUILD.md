# Build

`npm ci` installs the pinned Mapbox GL dependency. `npm run build` copies only public allowlisted assets, generates the browser data and 160 current location pages plus regional and supporting pages, and validates internal references. The location/page counts will change with future source refreshes.

`dist/` is the only deployable directory. Never upload the repository root. Generated top-level information pages are copied back to the repository for easy inspection; their source is `scripts/build-pages.cjs`.

The release stamp in `build.js` must match `CACHE_VERSION` in `service-worker.js`. Bump both for shell changes to avoid mixing cached and new releases. Asset URLs are versioned. Precache fetches explicitly reload the network.

Use `npm run dev` for a local production preview. No PHP, database, environment file or bundler service is required.
