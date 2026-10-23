/* Read the explicit coming-soon layer from Rivian's public charging page assets.
   Never execute downloaded JavaScript or infer planned sites from missing details. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
export const SOURCE='https://rivian.com/experience/charging';
const STATES=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));
export function parseComingSoon(source){
 // Export names are minified by upstream builds; identify the explicit map
 // source instead. Keep recognizing the old name so malformed old assets fail.
 if(!source.includes('coming-soon-chargers-source')&&!source.includes('TEMP_COMING_SOON_LOCATIONS'))return null;
 const raw=source.match(/["']coming-soon-chargers-source["'],\w+=(\[\{city:.*?\}\])/s)?.[1];
 if(!raw)throw Error('Coming-soon source schema changed');
 const rows=JSON.parse(raw.replace(/([{,])(city|state|latitude|longitude):/g,'$1"$2":'));
 if(!rows.length||rows.length>1000)throw Error('Invalid coming-soon inventory size');
 const keys=new Set();
 for(const p of rows){
  if(typeof p.city!=='string'||!p.city.trim()||!STATES.has(p.state)||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>85||Math.abs(p.longitude)>180)throw Error('Invalid coming-soon location');
  const key=`${p.state}:${p.city.toLowerCase()}`;if(keys.has(key))throw Error('Duplicate coming-soon location');keys.add(key);
 }
 return rows;
}
export async function fetchComingSoon({cacheDir,fetchImpl=fetch}={}){
 async function get(url,key){
  const file=cacheDir&&path.join(cacheDir,key);
  if(file&&fs.existsSync(file))return fs.readFileSync(file,'utf8');
  const r=await fetchImpl(url,{signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error(`Coming-soon source returned HTTP ${r.status}`);
  const text=await r.text();if(text.length>8e6)throw Error('Oversized coming-soon source');
  if(file){fs.mkdirSync(cacheDir,{recursive:true});fs.writeFileSync(file,text);}return text;
 }
 const html=await get(SOURCE,'coming-soon-page.html'),$=load(html);
 const assets=[...new Set($('script[src]').map((i,el)=>new URL($(el).attr('src'),SOURCE).href).get())].filter(url=>{const u=new URL(url);return u.origin==='https://rivian.com'&&u.pathname.startsWith('/root/_next/static/chunks/')&&u.pathname.endsWith('.js');});
 if(!assets.length||assets.length>100)throw Error('Coming-soon assets missing or unexpected');
 for(const url of assets){
  const source=await get(url,'coming-soon-'+path.basename(new URL(url).pathname));
  const rows=parseComingSoon(source);
  if(rows)return {rows,sourceUrl:SOURCE+'#map',assetUrl:url,sha256:createHash('sha256').update(source).digest('hex')};
 }
 throw Error('Explicit coming-soon layer not found; retaining previous inventory');
}
// Rebuild yesterday's announcement rows from the published inventory, so a coming-soon source
// change keeps the announced cities (with their original verification dates) instead of failing.
export function retainedComingSoonRows(prior){
 return prior.filter(p=>p.planningSource==='rivian-coming-soon'&&p.status==='planned'&&p.listed!==false&&!p.promotion)
  .map(p=>({city:p.city,state:p.state,latitude:p.lat,longitude:p.lng}));
}
export function plannedRecords(rows,date,prior=[],{retained=false}={}){
 return rows.map(p=>{
  const city=p.city.trim(),key=`${p.state}-${city.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')}`;
  const sourceId='RIVIAN-PLANNED-'+key,digest=createHash('sha256').update(sourceId).digest('hex'),old=prior.find(x=>x.sourceId===sourceId);
  return {id:old?.id??parseInt(digest.slice(0,12),16)+1000000,slug:old?.slug||`ran-coming-soon-${key.toLowerCase()}-${digest.slice(0,10)}`,name:`${city}, ${p.state}`,type:'RAN',network:'Rivian Adventure Network',sourceId,sourceKind:'charging-map',sourceUrl:SOURCE+'#map',planningSource:'rivian-coming-soon',address:null,displayAddress:null,city,state:p.state,country:['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].includes(p.state)?'CA':'US',lat:p.latitude,lng:p.longitude,coordinatePrecision:'city',coordinateSource:SOURCE+'#map',chargerCount:null,maxKw:null,maxPowerLabel:null,reliabilityGrade:null,rivianOnly:null,capabilities:['charging'],services:[],status:'planned',listed:true,hours:null,chargingHours:null,timezone:null,phone:null,rivianUrl:null,bookingUrl:null,lastVerified:retained&&old?.lastVerified||date,firstSeen:old?.firstSeen||date};
 });
}
const cityKey=p=>`${p.country}:${p.state}:${p.city.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}`;
function distanceKm(a,b){
 if(![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
 const rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
 return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2)));
}
export function mergePlanned(active,rows,date,prior=[],report={},{retained: keepDates=false}={}){
 const oldBySource=new Map(prior.map(p=>[p.sourceId,p]));
 // Preserve established identities even if a source temporarily removes a station.
 active=active.map(p=>{
  const old=oldBySource.get(p.sourceId);
  return old?.promotion?{...p,id:old.id,slug:old.slug,firstSeen:old.firstSeen,legacyIds:old.legacyIds,legacySlugs:old.legacySlugs,promotion:old.promotion}:p;
 });
 const linked=new Set(prior.filter(p=>p.promotion).map(p=>p.promotion.plannedSourceId));
 let planned=plannedRecords(rows,date,prior,{retained:keepDates}).filter(p=>!linked.has(p.sourceId));
 const announced=new Set(planned.map(p=>p.sourceId));
 const retired=prior.filter(p=>p.status==='planned'&&p.planningSource==='rivian-coming-soon'&&!announced.has(p.sourceId)&&!linked.has(p.sourceId));
 // Rivian can publish an operating station while still announcing that city as coming soon, so a
 // still-listed announcement is matched the same way as a retired one; otherwise both appear.
 const pending=[...retired.map(p=>({p,stillAnnounced:false})),...planned.map(p=>({p,stillAnnounced:true}))];
 const promoted=new Set();report.promoted=[];report.unresolved=[];
 for(const {p,stillAnnounced} of pending){
  // Require a fully addressed RAN site in the same locality, first observed after the
  // announcement, within 10 km, and the only candidate. Proximity alone is insufficient.
  const candidates=active.filter(a=>!a.promotion&&a.listed!==false&&a.type==='RAN'&&a.status!=='planned'&&a.address&&a.chargerCount>0&&cityKey(a)===cityKey(p)&&a.firstSeen>p.firstSeen);
  const candidate=candidates.length===1?candidates[0]:null;
  const competitors=pending.filter(other=>cityKey(other.p)===cityKey(p));
  if(!candidate||competitors.length!==1||distanceKm(p,candidate)>10){
   // A listed announcement without any new local station is simply still coming soon.
   if(!stillAnnounced||candidates.length)report.unresolved.push({sourceId:p.sourceId,candidateIds:candidates.map(a=>a.sourceId),reason:!candidate?'No unique new active site':competitors.length!==1?'Multiple announcements':'Station beyond 10 km matching radius'});
   continue;
  }
  const evidence={plannedSourceId:p.sourceId,activeSourceId:candidate.sourceId,matchedAt:date,activeFirstSeen:candidate.firstSeen,method:stillAnnounced?'announced-city-new-local-station':'retired-announcement-new-local-station',distanceKm:Math.round(distanceKm(p,candidate)*100)/100};
  const replacement={...candidate,id:p.id,slug:p.slug,firstSeen:p.firstSeen,
   legacyIds:[...new Set([...(p.legacyIds||[]),...(candidate.legacyIds||[]),candidate.id])].filter(id=>id!==p.id),
   legacySlugs:[...new Set([...(p.legacySlugs||[]),...(candidate.legacySlugs||[]),candidate.slug])].filter(slug=>slug!==p.slug),promotion:evidence};
  active[active.indexOf(candidate)]=replacement;promoted.add(p.sourceId);report.promoted.push(evidence);
 }
 planned=planned.filter(p=>!promoted.has(p.sourceId));
 const ids=new Set([...active,...planned].map(s=>s.sourceId));
 const retained=prior.filter(s=>!ids.has(s.sourceId)&&!promoted.has(s.sourceId)&&!linked.has(s.sourceId)).map(s=>({...s,listed:false,status:s.status==='planned'?'planned':'unknown'}));
 return [...active,...planned,...retained].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
}
