#!/usr/bin/env node
/* Add (or update) a permit site in data/permit-sites.json from a RAN Tracker post.

   node scripts/add-permit-site.mjs --city Jackson --state WY --address "520 West Broadway" \
     --stage permit-filed --reported 2026-10-20 --source https://x.com/rantracker/status/123

   The pin comes from geocoding the permit address with OpenStreetMap Nominatim. Pass --lat and
   --lng instead to enter coordinates yourself. Then run `npm run refresh:permits` so merging publishes it. */
import fs from 'node:fs';
import {PERMIT_FILE,STAGES,validatePermitSites} from './permit-sites.mjs';

const CANADA=new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));

export async function geocode({address,city,state},fetchImpl=fetch){
  const query=new URLSearchParams({street:address,city,state,country:CANADA.has(state)?'Canada':'United States',format:'jsonv2',limit:'1'});
  const r=await fetchImpl(`https://nominatim.openstreetmap.org/search?${query}`,{headers:{'User-Agent':'RivianSpotter permit curation (support@rivianspotter.com)'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`Geocoding failed: HTTP ${r.status}`);
  const [hit]=await r.json();
  if(!hit)return null;
  return {lat:Math.round(Number(hit.lat)*1e6)/1e6,lng:Math.round(Number(hit.lon)*1e6)/1e6,coordinateSource:'OpenStreetMap Nominatim geocode of the permit address (© OpenStreetMap contributors)'};
}

export function upsertSite(data,site){
  const same=s=>s.state===site.state&&s.city.trim().toLowerCase()===site.city.trim().toLowerCase()&&s.address.trim().toLowerCase()===site.address.trim().toLowerCase();
  const sites=data.sites.some(same)?data.sites.map(s=>same(s)?site:s):[...data.sites,site];
  return validatePermitSites({...data,sites:sites.sort((a,b)=>a.state.localeCompare(b.state)||a.city.localeCompare(b.city)||a.address.localeCompare(b.address))});
}

async function main(){
  const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
  const site={city:value('--city'),state:value('--state')?.toUpperCase(),address:value('--address'),stage:value('--stage'),reportedOn:value('--reported'),sourceUrl:value('--source')};
  if(Object.values(site).some(v=>!v))throw Error(`Usage: --city --state --address --stage (${Object.keys(STAGES).join('|')}) --reported YYYY-MM-DD --source <post URL> [--lat --lng]`);
  const lat=Number(value('--lat')),lng=Number(value('--lng'));
  const pin=value('--lat')&&value('--lng')?{lat,lng,coordinateSource:'Entered manually from the permit address'}:await geocode(site);
  if(!pin)throw Error(`Couldn’t find “${site.address}, ${site.city}, ${site.state}” on the map. Check the address, or pass --lat and --lng.`);
  const data=upsertSite(JSON.parse(fs.readFileSync(PERMIT_FILE,'utf8')),{...site,...pin});
  fs.writeFileSync(PERMIT_FILE,JSON.stringify(data,null,2)+'\n');
  console.log(`Saved ${site.city}, ${site.state} (${STAGES[site.stage]}) at ${pin.lat}, ${pin.lng}. Run npm run refresh:permits to publish it with your change.`);
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split('/').pop()))main().catch(e=>{console.error(e.message);process.exitCode=1;});
