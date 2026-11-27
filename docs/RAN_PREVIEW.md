# RAN preview

The beta detail page reads /data/ran-performance.json separately from the daily location catalog. The file contains rolling 12-month curves, observed 20–80% times and timestamped equipment status. An entry with no curves can still show working charger counts.

To build a local preview, run npm ci, npm test and npm run build. Build the local data snapshot into a new directory with node scripts/beta-json-snapshot.cjs data dist/api/v1/catalog.json /path/to/snapshot. Run node scripts/refresh-ran-preview.cjs /path/to/ran-performance.json with one or more station IDs to collect a small sample, or omit the IDs for a network sweep. Serve the result with RIVSPOTTER_PREVIEW_SNAPSHOT and RIVSPOTTER_PREVIEW_PERFORMANCE pointing to those paths when running node scripts/serve.cjs.

The Cloudflare beta route uses the existing Amplify beta shell and beta data origin. The scheduled beta workflow mirrors refreshed catalog JSON to that data origin and publishes station observations to the dedicated beta-ran-data branch every six hours. The beta browser reads those station observations independently of shell deployments.

For every live RAN coverage check, randomly select two or three distinct stations from the current catalog of listed RAN locations. Draw a fresh sample each time and include stations with missing data in the pool. Open the selected station pages on the environment under review and compare the rendered charger count, check time, and charging curves or missing-data message with the latest feed. For release checks, also compare the full eligible catalog and route index with the feed.
