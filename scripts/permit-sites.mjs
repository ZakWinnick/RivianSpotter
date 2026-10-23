/* Rivian Adventure Network sites found in public permit filings, curated by hand from RAN
   Tracker (https://x.com/rantracker) posts in data/permit-sites.json. These are not Rivian
   announcements; every entry links the post it came from. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const PERMIT_FILE=path.join(ROOT,'data/permit-sites.json');
export const STAGES={'permit-filed':'Permit filed','permit-approved':'Permit approved','under-construction':'Under construction',
 // A post that names the site without a stage (often "added to Rivian's map"), or calls it open
 // although Rivian's charging map doesn't list it.
 reported:'Reported','reported-open':'Reported open'};
// A site with no update for this long is shown as "No update since …" rather than coming soon.
export const STALLED_MONTHS=18;
const STATES=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));

export function validatePermitSites(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.sites))throw Error('Invalid permit-sites.json');
 const source=data.source||{};
 if(typeof source.name!=='string'||!source.name||!/^https:\/\/(x|twitter)\.com\//.test(source.url||''))throw Error('permit-sites.json needs a source name and X profile URL');
 const keys=new Set();
 for(const s of data.sites){
  const where=`${s.city}, ${s.state}`;
  if(typeof s.city!=='string'||!s.city.trim()||!STATES.has(s.state))throw Error(`Permit site needs a city and US state or Canadian province: ${where}`);
  if(typeof s.address!=='string'||!s.address.trim())throw Error(`Permit site needs the filed street address: ${where}`);
  if(!STAGES[s.stage])throw Error(`Permit site stage must be one of ${Object.keys(STAGES).join(', ')}: ${where}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.reportedOn||''))throw Error(`Permit site needs reportedOn (YYYY-MM-DD): ${where}`);
  const url=new URL(s.sourceUrl||'about:blank');
  if(url.protocol!=='https:'||!['x.com','twitter.com'].includes(url.hostname)||!url.pathname.includes('/status/'))throw Error(`Permit site needs the source post URL on X: ${where}`);
  if(!Number.isFinite(s.lat)||!Number.isFinite(s.lng)||Math.abs(s.lat)>85||Math.abs(s.lng)>180)throw Error(`Permit site needs coordinates for the permit address (run scripts/add-permit-site.mjs): ${where}`);
  if(typeof s.coordinateSource!=='string'||!s.coordinateSource)throw Error(`Permit site needs coordinateSource: ${where}`);
  if(s.firstReported!=null&&!/^\d{4}-\d{2}-\d{2}$/.test(s.firstReported))throw Error(`firstReported must be YYYY-MM-DD: ${where}`);
  if(s.addressNote!=null&&typeof s.addressNote!=='string')throw Error(`addressNote must be text: ${where}`);
  const key=`${s.state}:${s.city.trim().toLowerCase()}:${s.address.trim().toLowerCase()}`;
  if(keys.has(key))throw Error(`Duplicate permit site: ${s.address}, ${where}`);keys.add(key);
 }
 return data;
}

export function loadPermitSites(file=PERMIT_FILE){
 if(!fs.existsSync(file))return {source:null,sites:[]};
 const data=validatePermitSites(JSON.parse(fs.readFileSync(file,'utf8')));
 return {source:data.source,sites:data.sites.map(s=>({...s,city:s.city.trim(),address:s.address.trim(),sourceName:data.source.name,sourceProfile:data.source.url}))};
}

// The permit facts shown with a coming-soon site.
export function permitDetails(site,date=new Date().toISOString().slice(0,10)){
 const cutoff=new Date(date+'T00:00:00Z');cutoff.setUTCMonth(cutoff.getUTCMonth()-STALLED_MONTHS);
 const stalled=site.reportedOn<cutoff.toISOString().slice(0,10);
 return {stage:site.stage,stageLabel:STAGES[site.stage],address:site.address,reportedOn:site.reportedOn,sourceUrl:site.sourceUrl,sourceName:site.sourceName,sourceProfile:site.sourceProfile,
  ...(site.siteName?{siteName:site.siteName}:{}),...(site.addressNote?{addressNote:site.addressNote}:{}),...(site.firstReported?{firstReported:site.firstReported}:{}),
  ...(stalled?{stalled:true}:{})};
}
