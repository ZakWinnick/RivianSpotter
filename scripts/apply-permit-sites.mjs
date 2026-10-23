#!/usr/bin/env node
/* Publish changes to data/permit-sites.json without a full refresh.

   npm run refresh:permits && npm run build && npm test

   Re-merges the permit sites into the published charging inventory, keeping today's operating
   stations and Rivian's coming-soon announcements exactly as the last refresh left them, and
   records any new Coming Soon sites in the public updates feed. Nothing is fetched, so this takes
   seconds; commit the changed data files with the permit change and merging publishes it. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {mergePlanned,retainedComingSoonRows} from './refresh-coming-soon.mjs';
import {loadPermitSites} from './permit-sites.mjs';
import {validateRefresh} from './refresh-charging.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// The published inventory with today's permit sites applied. Operating stations and promotions
// pass through unchanged; announcements keep their verification dates.
export function applyPermitSites(prior,permits,date){
 const active=prior.filter(p=>p.status!=='planned');
 const records=mergePlanned(active,retainedComingSoonRows(prior),date,prior,{},{retained:true,permits});
 validateRefresh(records,prior);
 return records;
}

function main(){
 const read=name=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',name),'utf8'));
 const write=(name,data)=>fs.writeFileSync(path.join(ROOT,'data',name),JSON.stringify(data,null,2)+'\n');
 const date=new Date().toISOString().slice(0,10),prior=read('charging.json'),permits=loadPermitSites();
 const before=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'spotter-permits-')),'before.json');
 const feed=command=>execFileSync(process.execPath,[path.join(ROOT,'scripts/update-location-feed.cjs'),command,before],{cwd:ROOT,stdio:'inherit'});
 feed('snapshot');
 const records=applyPermitSites(prior,permits.sites,date);
 const summary=read('charging-summary.json');
 write('charging.json',records);
 write('charging-summary.json',{...summary,permitSites:{count:permits.sites.length,sourceUrl:permits.source?.url||null},
  counts:Object.fromEntries(['RAN','Waypoint'].map(t=>[t,records.filter(p=>p.type===t&&p.listed!==false).length])),
  sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')});
 feed('record');
 const planned=list=>new Set(list.filter(p=>p.status==='planned').map(p=>p.sourceId));
 const was=planned(prior),now=planned(records);
 console.log(`Applied ${permits.sites.length} permit sites: ${[...now].filter(id=>!was.has(id)).length} added, ${[...was].filter(id=>!now.has(id)).length} removed. Run npm run build && npm test, then commit the data files.`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))main();
