import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';
import {fetchComingSoon,mergePlanned,retainedComingSoonRows} from './refresh-coming-soon.mjs';

export const SOURCE = 'https://rivian.com/experience/charging#map';
export const TILES = 'https://api.rivianservices.com/map-chargers/tiles/chrg2';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NETWORKS = {'Rivian Adventure Network': 'RAN', 'Rivian Waypoints Network': 'Waypoint'};
const CA = new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));
const US = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
// Cover the continental US and Canada, Alaska, Hawaii, and northern Canada.
export const COVERAGE = [[-141,24,-50,72],[-180,50,-129,72],[-161,18,-154,23],[-141,60,-50,84]];
export function tileFor(lng, lat, z) {
  const n = 2 ** z, r = lat * Math.PI / 180;
  return [z, Math.min(n-1, Math.max(0, Math.floor((lng+180)/360*n))), Math.min(n-1, Math.max(0, Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n)))];
}
export function coverageTiles(z = 6) {
  const tiles = new Map();
  for (const [west,south,east,north] of COVERAGE) {
    const [,x1,y1] = tileFor(west,north,z), [,x2,y2] = tileFor(east,south,z);
    for (let x=x1;x<=x2;x++) for(let y=y1;y<=y2;y++) tiles.set(`${z}/${x}/${y}`, [z,x,y]);
  }
  return [...tiles.values()];
}
export function decodeTile(bytes, [z,x,y]) {
  if (!bytes.length) return [];
  const layer = new VectorTile(new PbfReader(bytes)).layers.Charger;
  if (!layer) return [];
  const result=[];
  for(let i=0;i<layer.length;i++) {
    const f=layer.feature(i);
    if (NETWORKS[f.properties.network]) {
      if(f.type!==1) throw Error('Charging source contains non-point geometry');
      result.push(f.toGeoJSON(x,y,z));
    }
  }
  return result;
}
export function normalize(feature, date, previous) {
  const p=feature.properties, [lng,lat]=feature.geometry.coordinates;
  if (!NETWORKS[p.network] || typeof p.id!=='string' || !p.id || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) throw Error('Invalid charging station identity or coordinates');
  const country=CA.has(p.state)?'CA':US.has(p.state)?'US':null;
  if (!country) return null; // This directory covers US and Canadian locations.
  for(const key of ['address','city','state']) if(typeof p[key]!=='string' || !p[key].trim()) throw Error(`Missing station ${key}: ${p.id}`);
  if(p.name != null && typeof p.name!=='string') throw Error(`Invalid station name: ${p.id}`);
  const count=p.count == null ? null : Number(p.count), maxKw=p.maxkw == null ? null : Number(p.maxkw);
  if(count!==null && (!Number.isInteger(count)||count<0||count>1000)) throw Error(`Invalid charger count: ${p.id}`);
  if(maxKw!==null && (!Number.isFinite(maxKw)||maxKw<0||maxKw>2000)) throw Error(`Invalid power: ${p.id}`);
  const digest=createHash('sha256').update(p.id).digest('hex');
  const id=previous?.id ?? parseInt(digest.slice(0,12),16)+1000000;
  const name=p.name?.trim() || `${p.city}, ${p.state}`;
  const slug=previous?.slug || `${NETWORKS[p.network].toLowerCase()}-${name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${digest.slice(0,10)}`;
  return {id,slug,name,type:NETWORKS[p.network],network:p.network,sourceId:p.id,sourceKind:'charging-map',sourceUrl:SOURCE,
    address:p.address.trim(),displayAddress:p.address.split(',')[0].trim(),city:p.city.trim(),state:p.state,country,lat,lng,coordinatePrecision:'map-pin',coordinateSource:TILES,
    chargerCount:count,maxKw,maxPowerLabel:maxKw>0?`Up to ${maxKw} kW`:null,
    reliabilityGrade:/^[A-F][+-]?$/.test(p.score || '') ? p.score : null,
    rivianOnly:typeof p.rivianonly==='boolean'?p.rivianonly:null,
    capabilities:['charging'],services:[NETWORKS[p.network]==='RAN'?'DC Fast Charging':'Level 2 Charging'],
    status:'unknown',listed:true,hours:null,chargingHours:null,timezone:null,phone:null,rivianUrl:null,bookingUrl:null,
    lastVerified:date,firstSeen:previous?.firstSeen || date};
}
export function validateRefresh(records, prior=[], {minimum=100,maxLoss=0.15}={}) {
  const current=records.filter(p=>p.listed!==false&&p.status!=='planned');
  for(const type of ['RAN','Waypoint']) {
    const n=current.filter(p=>p.type===type).length, old=prior.filter(p=>p.type===type&&p.listed!==false&&p.status!=='planned').length;
    if(n<minimum || (old && n<old*(1-maxLoss))) throw Error(`Incomplete ${type} inventory: ${n}, previously ${old}`);
  }
  for(const key of ['id','slug','sourceId']) if(new Set(records.map(p=>p[key])).size!==records.length) throw Error(`Duplicate charging ${key}`);
}
async function pool(items, fn, concurrency=4) {
  let next=0, failure;
  await Promise.all(Array.from({length:concurrency},async()=>{while(!failure && next<items.length) {try {await fn(items[next++]);} catch(e) {failure=e;}}}));
  if(failure) throw failure;
}
export async function refreshCharging({outputDir=ROOT,date=new Date().toISOString().slice(0,10),cacheDir}={}) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Invalid refresh date');
  const scratch=cacheDir || fs.mkdtempSync(path.join(os.tmpdir(),'spotter-charging-'));
  fs.mkdirSync(scratch,{recursive:true});
  const priorPath=path.join(ROOT,'data/charging.json'), prior=fs.existsSync(priorPath)?JSON.parse(fs.readFileSync(priorPath,'utf8')):[];
  // The coming-soon layer lives in Rivian's minified page assets and changes shape often. If it
  // can't be read, keep yesterday's announcements rather than blocking the whole refresh.
  let comingSoon, warnings=[];
  try {comingSoon=await fetchComingSoon({cacheDir:scratch});}
  catch(e) {
    const rows=retainedComingSoonRows(prior);
    if(!rows.length) throw e;
    comingSoon={rows,retained:true,error:e.message,sourceUrl:SOURCE,assetUrl:null,sha256:null};
    warnings.push(`Kept the previous ${rows.length} coming-soon locations: the coming-soon source could not be read (${e.message}).`);
  }
  const memo=new Map(); let requests=0, splitTiles=0;
  let gate=Promise.resolve(), pauseUntil=0;
  function throttle() {
    const turn=gate.then(async()=>{
      await new Promise(resolve=>setTimeout(resolve,Math.max(1000,pauseUntil-Date.now())));
    });
    gate=turn;return turn;
  }
  async function tile(coords) {
    const key=coords.join('/'); if(memo.has(key)) return memo.get(key);
    const pending=(async()=>{
      const file=path.join(scratch,key.replaceAll('/','-')+'.pbf');
      if(fs.existsSync(file)) return decodeTile(fs.readFileSync(file),coords);
      let last;
      for(let attempt=0;attempt<5;attempt++) {
        try {
          await throttle();requests++;
          const r=await fetch(`${TILES}/${key}`,{signal:AbortSignal.timeout(20000)});
          if(r.status===429) {
            const after=r.headers.get('retry-after'), delay=Number(after);
            pauseUntil=Date.now()+Math.max(30000*(attempt+1),Number.isFinite(delay)?delay*1000:(Date.parse(after)-Date.now())||0);
          }
          if(!r.ok) {const err=Error(`Charging tile ${key}: HTTP ${r.status}`);err.status=r.status;throw err;}
          const bytes=new Uint8Array(await r.arrayBuffer());
          const features=decodeTile(bytes,coords); fs.writeFileSync(file,bytes);return features;
        } catch(e) {
          last=e;
          if(e.status===504 && coords[0]<8) break;
          if(e.status && e.status<500 && e.status!==429) break;
          if(attempt<4) await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
        }
      }
      if(last?.status===504 && coords[0]<8) {
        splitTiles++; const [z,x,y]=coords, result=[];
        // Sequential children bound the total request concurrency even on a source outage.
        for(const dx of [0,1]) for(const dy of [0,1]) result.push(...await tile([z+1,x*2+dx,y*2+dy]));
        return result;
      }
      throw last;
    })(); memo.set(key,pending);return pending;
  }
  const discovered=new Map(), coverage=coverageTiles(); let scanned=0;
  console.log(`Scanning ${coverage.length} official charging-map tiles`);
  await pool(coverage,async c=>{
    for(const f of await tile(c)) discovered.set(f.properties.id,f);
    if(++scanned%50===0) console.log(`Scanned ${scanned}/${coverage.length}; ${discovered.size} Rivian stations`);
  });
  const refined=new Map(); let completed=0;
  console.log(`Refining ${discovered.size} station map pins`);
  await pool([...discovered.values()],async f=>{
    const [lng,lat]=f.geometry.coordinates, c=tileFor(lng,lat,12);
    let match=(await tile(c)).find(x=>x.properties.id===f.properties.id);
    // Low-zoom coordinates can round into a neighboring high-zoom tile.
    if(!match) for(const dx of [-1,0,1]) {for(const dy of [-1,0,1]) {
      if(!dx&&!dy) continue;
      match=(await tile([c[0],c[1]+dx,c[2]+dy])).find(x=>x.properties.id===f.properties.id);
      if(match) break;
    } if(match) break;}
    if(!match) throw Error(`Could not refine station ${f.properties.id}`);
    refined.set(f.properties.id,match);
    if(++completed%100===0) console.log(`Refined ${completed}/${discovered.size}`);
  });
  const old=new Map(prior.map(p=>[p.sourceId,p]));
  const active=[...refined.values()].map(f=>normalize(f,date,old.get(f.properties.id))).filter(Boolean);
  const promotionReport={};
  const records=mergePlanned(active,comingSoon.rows,date,prior,promotionReport,{retained:!!comingSoon.retained});
  const ids=new Set(records.filter(p=>p.listed!==false).map(p=>p.sourceId));
  validateRefresh(records,prior);
  const summary={date,sourceUrl:SOURCE,tileSource:TILES,coverage:COVERAGE,discoveryZoom:6,pinZoom:12,tilesScanned:coverage.length,splitTiles,requests,
    comingSoon:{count:comingSoon.rows.length,observedAt:new Date().toISOString(),sourceUrl:comingSoon.sourceUrl,assetUrl:comingSoon.assetUrl,sha256:comingSoon.sha256,...(comingSoon.retained?{retained:true,error:comingSoon.error}:{})},
    warnings,
    counts:Object.fromEntries(['RAN','Waypoint'].map(t=>[t,records.filter(p=>p.type===t&&p.listed!==false).length])),
    promotions:promotionReport,
    added:records.filter(p=>!old.has(p.sourceId)&&!p.promotion).map(p=>({id:p.id,name:p.name,slug:p.slug})),
    removed:prior.filter(p=>p.listed!==false&&!ids.has(p.sourceId)&&!promotionReport.promoted.some(m=>m.plannedSourceId===p.sourceId)).map(p=>({id:p.id,name:p.name,slug:p.slug})),
    sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')};
  fs.mkdirSync(path.join(outputDir,'data'),{recursive:true});
  for(const [name,data] of [['charging',records],['charging-summary',summary]]) fs.writeFileSync(path.join(outputDir,'data',`${name}.json`),JSON.stringify(data,null,2)+'\n');
  if(!cacheDir)fs.rmSync(scratch,{recursive:true,force:true});
  console.log(JSON.stringify(summary.counts)); return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const value=flag=>{const i=process.argv.indexOf(flag);return i<0?undefined:process.argv[i+1];};
  refreshCharging({outputDir:value('--output-dir'),date:value('--date'),cacheDir:value('--cache-dir')}).catch(e=>{console.error(e);process.exitCode=1;});
}
