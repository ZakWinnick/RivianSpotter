const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const M=require('../js/location-model.js'), U=require('../js/components.js');
const fixtures=require('./fixtures/charging-features.json');
const api=()=>import('../scripts/refresh-charging.mjs');

test('charging importer retains station facts, omits live availability and keeps stable links',async()=>{
 const {normalize}=await api();
 const waypoint=normalize(fixtures[0],'2026-10-14'),ran=normalize(fixtures[1],'2026-10-14');
 assert.equal(waypoint.type,'Waypoint'); assert.equal(ran.type,'RAN');
 assert.equal(ran.chargerCount,6);assert.equal(ran.maxKw,300);assert.equal(ran.rivianOnly,false);
 assert(!('available' in ran));assert(!('score' in ran));assert.equal(ran.hours,null);assert.equal(ran.status,'unknown');
 const renamed=normalize({...fixtures[1],properties:{...fixtures[1].properties,name:'A New Name'}},'2026-10-15',ran);
 assert.equal(renamed.id,ran.id);assert.equal(renamed.slug,ran.slug);assert.equal(renamed.firstSeen,ran.firstSeen);
 assert.equal(M.getOfficialLink(ran),null);assert.equal(M.isMapped(ran),true);
 assert.equal(new URL(M.getDirectionsUrl(ran)).searchParams.get('destination'),ran.address);
 const unnamed=normalize({...fixtures[0],properties:{...fixtures[0].properties,name:undefined}},'2026-10-14');
 assert.equal(unnamed.name,`${unnamed.city}, ${unnamed.state}`);
});
test('malformed coordinates, missing identities and suspicious inventory losses fail closed',async()=>{
 const {normalize,validateRefresh}=await api();
 assert.throws(()=>normalize({...fixtures[0],geometry:{coordinates:[999,37]}},'2026-10-14'),/Invalid/);
 assert.throws(()=>normalize({...fixtures[0],properties:{...fixtures[0].properties,id:''}},'2026-10-14'),/Invalid/);
 assert.throws(()=>normalize({...fixtures[0],properties:{...fixtures[0].properties,count:-1}},'2026-10-14'),/Invalid/);
 const records=fixtures.map(f=>normalize(f,'2026-10-14'));
 validateRefresh(records,[],{minimum:1});
 assert.throws(()=>validateRefresh(records,[]),/Incomplete/);
 assert.throws(()=>validateRefresh([...records,records[0]],[],{minimum:1}),/Duplicate/);
 assert.throws(()=>validateRefresh(records,Array.from({length:10},()=>records[0]),{minimum:1}),/Incomplete/);
});
test('charging search, network filters, saved IDs and published-hours filtering compose',async()=>{
 const {normalize}=await api(), records=fixtures.map(f=>normalize(f,'2026-10-14'));
 assert.equal(M.filterLocations(records,{query:'Adventure Manteca'}).length,1);
 assert.equal(M.filterLocations(records,{type:'Waypoint',intent:'charging'}).length,1);
 assert.equal(M.filterLocations(records,{savedOnly:true,savedIds:[records[1].id]})[0].type,'RAN');
 assert.equal(M.filterLocations(records,{openNow:true}).length,0);
 const retired={...records[0],listed:false};
 assert.equal(M.filterLocations([retired]).length,0);
 assert.equal(M.filterLocations([retired],{savedOnly:true,savedIds:[retired.id]}).length,1);
});
test('nearby places cross-link without merging access, hours or numeric identities',async()=>{
 const {normalize}=await api(), c=normalize(fixtures[1],'2026-10-14');
 const place={id:1,slug:'outpost',name:'An Outpost',type:'Outpost',state:c.state,lat:c.lat,lng:c.lng,coordinatePrecision:'exact',hours:'9am–5pm'};
 const [p,station]=M.combineLocations([place],[c]);
 assert.equal(p.chargingStations[0].id,c.id);assert.equal(station.nearbyPlaces[0].id,1);assert.equal(station.hours,null);assert.equal(p.hours,place.hours);
 const html=U.chargingDetails({...station,name:'<script>',nearbyPlaces:[{...place,name:'<img src=x onerror=alert(1)>'}]});
 assert.match(html,/6/);assert.match(html,/300/);assert.match(html,/Open to Other EVs/);assert.doesNotMatch(html,/<img|<script/);
 assert.match(U.chargingDetails({...station,rivianOnly:true}),/Rivian Vehicles Only/);
});
test('all imported chargers have unique IDs across both inventories and render self-contained pages',()=>{
 const chargers=require('../data/charging.json'),places=require('../data/locations.json'),summary=require('../data/charging-summary.json');
 const all=M.combineLocations(places,chargers);
 assert.equal(new Set(all.map(p=>p.id)).size,all.length);assert.equal(new Set(all.map(p=>p.slug)).size,all.length);
 for(const p of chargers){assert(M.isMapped(p));assert(!('available' in p));assert(M.getDirectionsUrl(p));}
 for(const type of ['RAN','Waypoint'])assert.equal(chargers.filter(p=>p.type===type&&p.listed!==false).length,summary.counts[type]);
 const sample=all.find(p=>p.type==='RAN'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'spotter-charging-pages-'));
 try{
  require('../scripts/build-pages.cjs').buildPages(dir,[sample],{charging:summary});
  const html=fs.readFileSync(path.join(dir,M.locationUrl(sample),'index.html'),'utf8');
  assert.match(html,/Maximum Power/);assert.match(html,/Directions/);assert.match(html,/data-save/);assert.match(html,/data-share/);assert.doesNotMatch(html,/Visiting hours|Demo-drive availability|Official Location/);
  assert.equal(fs.readFileSync('js/charging.js','utf8'),require('../scripts/generate-charging.cjs').render(chargers));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('refresh snapshot rejects malformed directory before applying files',async()=>{
 const {validateSnapshot}=await import('../scripts/refresh-all.mjs');
 assert.throws(()=>validateSnapshot([], {directoryCount:0}, [], [], []),/unexpectedly lost/);
 const places=require('../data/locations.json'), summary=require('../data/refresh-summary.json'),chargers=require('../data/charging.json');
 assert.doesNotThrow(()=>validateSnapshot(places,summary,chargers,places,chargers));
 assert.throws(()=>validateSnapshot(places,summary,[...chargers,{...chargers[0],sourceId:'collision',slug:'collision'}],places,chargers),/Duplicate/);
});
