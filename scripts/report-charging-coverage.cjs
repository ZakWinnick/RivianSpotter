// Recompute against current official inventory even if enrichment failed or is cooling down.
const fs=require('node:fs');
const {coverage}=require('./refresh-roamer.cjs');
const snapshot=JSON.parse(fs.readFileSync('data/roamer.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('data/charging.json','utf8'));
const c=coverage(snapshot.stations,inventory);
const lines=[
 `Charging details: ${c.detailCount}/${c.officialStationCount} official Rivian Adventure Network sites.`,
 `Captured within 36 hours: ${c.freshDetailCount}/${c.officialStationCount}.`,
 `Missing detail pages: ${c.missingDetailIds.length}. Stale captures: ${c.staleDetailIds.length}.`,
 `Sites without published pricing or hours: ${c.missingFields.length}.`,
 `Successful detail checks in the last pass: ${snapshot.coverage?.checkedCount??'unknown'}/${c.officialStationCount} (${snapshot.refreshMode||'legacy'}).`,
 `Last supplemental pass completed: ${snapshot.completedAt||'unknown'}.`,
 snapshot.nextRequestAfter?`Next eligible request: ${snapshot.nextRequestAfter}.`:''
].filter(Boolean);
for(const label of ['missingDetailIds','staleDetailIds'])if(c[label].length)lines.push(`${label}: ${c[label].join(', ')}`);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n\n')+'\n');
console.log(lines.join('\n'));
if(c.missingDetailIds.length||c.staleDetailIds.length||snapshot.detailErrors?.length||snapshot.rateLimited||snapshot.coverage?.notCheckedIds?.length)console.log('::warning::Charging refresh has missing, stale, or failed checks. See the coverage summary; retained data is not a fresh check.');
