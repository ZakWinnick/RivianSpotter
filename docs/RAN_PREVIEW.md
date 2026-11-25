# RAN preview

The beta detail page reads /data/ran-performance.json separately from the daily location catalog. The file contains rolling 12-month curves, observed 20–80% times and timestamped equipment status. An entry with no curves can still show working charger counts.

To build a local preview, run npm ci, npm test and npm run build. Build the local data snapshot into a new directory with node scripts/beta-json-snapshot.cjs data dist/api/v1/catalog.json /path/to/snapshot. Run node scripts/refresh-ran-preview.cjs /path/to/ran-performance.json with one or more station IDs to collect a small sample, or omit the IDs for a network sweep. Serve the result with RIVSPOTTER_PREVIEW_SNAPSHOT and RIVSPOTTER_PREVIEW_PERFORMANCE pointing to those paths when running node scripts/serve.cjs.

The beta Worker uses the existing beta Amplify shell, the published daily catalog and the dedicated beta-ran-data branch. The station snapshot is published as JSON on that branch and is independent of shell deployments.
