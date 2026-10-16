/* Read the explicit coming-soon layer from Rivian's public charging page assets.
   Never execute downloaded JavaScript or infer planned sites from missing details. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
export const SOURCE='https://rivian.com/experience/charging';
const STATES=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));
export function parseComingSoon(source){
 if(!source.includes('TEMP_COMING_SOON_LOCATIONS'))return null;
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
export function plannedRecords(rows,date,prior=[]){
 return rows.map(p=>{
  const city=p.city.trim(),key=`${p.state}-${city.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')}`;
  const sourceId='RIVIAN-PLANNED-'+key,digest=createHash('sha256').update(sourceId).digest('hex'),old=prior.find(x=>x.sourceId===sourceId);
  return {id:old?.id??parseInt(digest.slice(0,12),16)+1000000,slug:old?.slug||`ran-coming-soon-${key.toLowerCase()}-${digest.slice(0,10)}`,name:`${city}, ${p.state}`,type:'RAN',network:'Rivian Adventure Network',sourceId,sourceKind:'charging-map',sourceUrl:SOURCE+'#map',planningSource:'rivian-coming-soon',address:null,displayAddress:null,city,state:p.state,country:['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].includes(p.state)?'CA':'US',lat:p.latitude,lng:p.longitude,coordinatePrecision:'city',coordinateSource:SOURCE+'#map',chargerCount:null,maxKw:null,maxPowerLabel:null,reliabilityGrade:null,rivianOnly:null,capabilities:['charging'],services:[],status:'planned',listed:true,hours:null,chargingHours:null,timezone:null,phone:null,rivianUrl:null,bookingUrl:null,lastVerified:date,firstSeen:old?.firstSeen||date};
 });
}
export function mergePlanned(active,rows,date,prior=[]){
 const planned=plannedRecords(rows,date,prior),ids=new Set([...active,...planned].map(s=>s.sourceId));
 // City-only announcements cannot safely be matched to an active station by city alone.
 return [...active,...planned,...prior.filter(s=>!ids.has(s.sourceId)).map(s=>({...s,listed:false,status:s.planningSource?'planned':'unknown'}))].sort((a,b)=>a.sourceId.localeCompare(b.sourceId));
}
