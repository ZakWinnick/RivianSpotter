import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {refreshCharging,validateRefresh} from './refresh-charging.mjs';
const require=createRequire(import.meta.url), ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {refresh}=require('./refresh-locations.cjs');
const M=require('../js/location-model.js');
const load=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function validateSnapshot(places, summary, chargers, priorPlaces, priorChargers) {
  const previous=priorPlaces.filter(p=>p.sourceKind==='directory').length;
  if(summary.directoryCount<100 || summary.directoryCount<previous*0.85) throw Error('Official directory unexpectedly lost more than 15% of its listings');
  if(places.filter(p=>p.sourceKind==='directory').length!==summary.directoryCount) throw Error('Directory count mismatch');
  validateRefresh(chargers,priorChargers);
  const all=[...places,...chargers];
  for(const key of ['id','slug']) if(new Set(all.map(p=>p[key])).size!==all.length) throw Error(`Duplicate location ${key}`);
  for(const key of ['id','slug']) {
    const values=all.flatMap(p=>[p[key],...(p[key==='id'?'legacyIds':'legacySlugs']||[])]);
    if(new Set(values).size!==values.length)throw Error(`Conflicting location ${key} alias`);
  }
  for(const p of places) {
    if(p.sourceKind==='legacy')continue;
    if(!p.name||!p.state||!p.address||p.lastVerified!==summary.date) throw Error('Incomplete location record');
    if(!M.getOfficialLink(p))throw Error('Missing official location destination');
  }
  for(const p of chargers) if(p.listed!==false && (!M.isMapped(p)||(p.status!=='planned'&&!M.getDirectionsUrl(p))))throw Error('Unusable charging station map pin');
}
export async function refreshAll({cacheDir}={}) {
  const stage=fs.mkdtempSync(path.join(os.tmpdir(),'spotter-refresh-'));
  try {
    const date=new Date().toISOString().slice(0,10);
    const summary=await refresh({date,outputDir:stage});
    await refreshCharging({date,outputDir:stage,cacheDir});
    const places=load(path.join(stage,'data/locations.json')), chargers=load(path.join(stage,'data/charging.json'));
    validateSnapshot(places,summary,chargers,load(path.join(ROOT,'data/locations.json')),load(path.join(ROOT,'data/charging.json')));
    for(const file of ['locations.json','refresh-summary.json','location-history.json','charging.json','charging-summary.json']) fs.copyFileSync(path.join(stage,'data',file),path.join(ROOT,'data',file));
    require('./generate-data.cjs').generate(ROOT);require('./generate-charging.cjs').generate(ROOT);
    console.log(`Validated refresh: ${places.length} places and ${chargers.filter(p=>p.listed!==false).length} charging stations`);
  } finally {fs.rmSync(stage,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const i=process.argv.indexOf('--cache-dir');
  refreshAll({cacheDir:i<0?undefined:process.argv[i+1]}).catch(e=>{console.error(e);process.exitCode=1;});
}
