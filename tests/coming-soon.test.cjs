const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const M=require('../js/location-model.js'),U=require('../js/components.js');
const rows=require('./fixtures/coming-soon-locations.json');
const api=()=>import('../scripts/refresh-coming-soon.mjs');
const asset=rows=>`let o="coming-soon-chargers-source",a=${JSON.stringify(rows).replace(/"(city|state|latitude|longitude)":/g,'$1:')};exports=["TEMP_COMING_SOON_LOCATIONS",a];`;
test('explicit upcoming source parses both requested cities without executing JavaScript',async()=>{
 const {parseComingSoon}=await api();assert.deepEqual(parseComingSoon(asset(rows)),rows);
 for(const city of ['King City','Salinas'])assert(rows.some(p=>p.city===city&&p.state==='CA'));
 assert.equal(parseComingSoon('unrelated asset'),null);
 assert.throws(()=>parseComingSoon('TEMP_COMING_SOON_LOCATIONS changed structure'),/schema changed/);
 assert.throws(()=>parseComingSoon(asset([...rows,rows[0]])),/Duplicate/);
 assert.throws(()=>parseComingSoon(asset([{...rows[0],latitude:999}])),/Invalid/);
 assert.throws(()=>parseComingSoon(asset(rows).replace('latitude:33.917796','latitude:process.exit()')));
});
test('asset discovery follows page references on Rivian only and fails closed when the layer disappears',async()=>{
 const {fetchComingSoon}=await api(),calls=[];
 const fetchImpl=async url=>{calls.push(url);return new Response(calls.length===1?'<script src="https://evil.example/fake.js"></script><script src="/root/_next/static/chunks/new-build.js"></script>':asset(rows));};
 const result=await fetchComingSoon({fetchImpl});assert.equal(result.rows.length,36);assert.equal(calls.length,2);assert.equal(result.assetUrl,'https://rivian.com/root/_next/static/chunks/new-build.js');
 await assert.rejects(fetchComingSoon({fetchImpl:async()=>new Response('<html>changed</html>')}),/assets missing/);
 await assert.rejects(fetchComingSoon({fetchImpl:async()=>new Response('',{status:429})}),/HTTP 429/);
});
test('planned pins are searchable and mappable but do not supply directions, port facts, or nearby charging',async()=>{
 const {plannedRecords}=await api(),p=plannedRecords(rows,'2026-10-16').find(p=>p.city==='King City');
 assert.equal(p.status,'planned');assert.equal(p.address,null);assert.equal(p.chargerCount,null);assert.equal(p.maxKw,null);
 assert(M.isMapped(p));assert.equal(M.getDirectionsUrl(p),null);assert.equal(M.chargingSummary(p),'Coming Soon');
 assert.equal(M.filterLocations([p],{query:'King City',mode:'charge',type:'RAN'}).length,1);
 assert.equal(M.filterLocations([p],{openNow:true}).length,0);
 const place={id:1,state:p.state,lat:p.lat,lng:p.lng,coordinatePrecision:'exact'};
 const combined=M.combineLocations([place],[p]);assert.equal(combined[0].chargingStations.length,0);assert.equal(combined[1].nearbyPlaces.length,0);
 const html=U.chargingDetails(p);assert.match(html,/Coming Soon/);assert.match(html,/Approximate location/);assert.doesNotMatch(html,/Individual Chargers|Maximum Power|Pricing per kWh/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spotter-planned-page-'));
 try{require('../scripts/build-pages.cjs').buildPages(dir,[p]);const page=fs.readFileSync(path.join(dir,M.locationUrl(p),'index.html'),'utf8');assert.match(page,/Coming Soon/);assert.match(page,/Show on Map/);assert.doesNotMatch(page,/>Directions<|Maximum Power|Pricing per kWh/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('planned identity survives coordinate changes and same-city active sites stay separate',async()=>{
 const {plannedRecords,mergePlanned}=await api(),planned=plannedRecords(rows,'2026-10-16');
 const updated=plannedRecords([{...rows[0],latitude:rows[0].latitude+0.01}],'2026-10-17',planned)[0];assert.equal(updated.id,planned[0].id);assert.equal(updated.slug,planned[0].slug);assert.equal(updated.firstSeen,'2026-10-16');
 const active={id:1,sourceId:'US-RIV-L123',name:'Cabazon',city:rows[0].city,state:rows[0].state,status:'unknown'};
 const merged=mergePlanned([active],rows,'2026-10-17',planned);assert(merged.some(s=>s.sourceId===active.sourceId));assert(merged.some(s=>s.sourceId===planned[0].sourceId));
 const removed=mergePlanned([active],rows.slice(1),'2026-10-18',planned).find(s=>s.id===planned[0].id);assert.equal(removed.listed,false);assert.equal(removed.status,'planned');assert.match(U.chargingDetails(removed),/No Longer Listed/);
});
test('future sites do not inflate detail coverage or hide active inventory losses',async()=>{
 const {plannedRecords}=await api(),planned=plannedRecords(rows,'2026-10-16'),roamer=require('../scripts/refresh-roamer.cjs');
 assert.equal(roamer.coverage([],planned).officialStationCount,0);
 const {validateRefresh}=await import('../scripts/refresh-charging.mjs');assert.throws(()=>validateRefresh(planned,[],{minimum:1}),/Incomplete RAN/);
});

function activeFrom(p,overrides={}){
 return {...p,id:123,slug:'ran-new-active',sourceId:'US-RIV-L123',planningSource:undefined,status:'unknown',address:'100 Main St',displayAddress:'100 Main St',coordinatePrecision:'map-pin',chargerCount:8,maxKw:300,firstSeen:'2026-10-18',...overrides};
}
test('retired announcement becomes a detailed station while preserving both published identities',async()=>{
 const {plannedRecords,mergePlanned}=await api(),p=plannedRecords([rows[0]],'2026-10-16')[0],active=activeFrom(p),report={};
 const merged=mergePlanned([active],[],'2026-10-18',[p],report);assert.equal(merged.length,1);
 const station=merged[0];assert.equal(station.id,p.id);assert.equal(station.slug,p.slug);assert.equal(station.sourceId,active.sourceId);assert.equal(station.address,'100 Main St');assert.equal(station.status,'unknown');assert.deepEqual(station.legacyIds,[active.id]);assert.deepEqual(station.legacySlugs,[active.slug]);assert.equal(report.promoted.length,1);
 const combined=M.combineLocations([],merged,[{sourceId:active.sourceId,sourceUrl:'https://rivianroamer.com/charging/sites/'+active.sourceId,detailRates:{Energy:'$0.45/kWh'},hours:'24/7',chargers:[{name:'1',powerKw:300,connector:'NACS',features:[]}]}])[0];
 const html=U.chargingDetails(combined);assert.match(html,/0.45/);assert.match(html,/NACS/);assert.doesNotMatch(html,/Coming Soon/);assert(M.getDirectionsUrl(combined));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spotter-promoted-page-'));
 try{require('../scripts/build-pages.cjs').buildPages(dir,[combined]);const page=fs.readFileSync(path.join(dir,M.locationUrl(p),'index.html'),'utf8'),alias=fs.readFileSync(path.join(dir,M.locationUrl(active),'index.html'),'utf8');assert.equal(page,alias);assert(page.includes('https://rivianspotter.com'+M.locationUrl(p)));assert.match(page,/100 Main St/);assert.match(page,/0.45/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('promotion is stable across repeated updates, source disappearance, and announcement reappearance',async()=>{
 const {plannedRecords,mergePlanned}=await api(),p=plannedRecords([rows[0]],'2026-10-16')[0],active=activeFrom(p);
 // An active page can be published before the announcement disappears.
 const overlap=mergePlanned([active],[rows[0]],'2026-10-18',[p]);assert.equal(overlap.length,2);
 const promoted=mergePlanned([active],[],'2026-10-19',overlap);
 const {normalize}=await import('../scripts/refresh-charging.mjs');
 const refreshed=normalize({properties:{id:active.sourceId,network:'Rivian Adventure Network',city:p.city,state:p.state,address:'200 Main St',count:12,maxkw:300},geometry:{coordinates:[p.lng,p.lat]}},'2026-10-20',promoted[0]);
 const next=mergePlanned([refreshed],[rows[0]],'2026-10-20',promoted);assert.equal(next.length,1);assert.equal(next[0].id,p.id);assert.equal(next[0].chargerCount,12);assert.equal(next[0].address,'200 Main St');assert.equal(next[0].promotion.activeFirstSeen,'2026-10-18');assert.equal(next[0].firstSeen,'2026-10-16');
 const missing=mergePlanned([],[],'2026-10-21',next);assert.equal(missing[0].listed,false);assert.equal(missing[0].status,'unknown');
 const restored=mergePlanned([active],[],'2026-10-22',missing);assert.equal(restored[0].id,p.id);assert.equal(restored[0].listed,true);assert.deepEqual(restored[0].legacySlugs,[active.slug]);
 // A delayed active listing can also match an already-retired announcement.
 const retired=mergePlanned([],[],'2026-10-17',[p]);assert.equal(mergePlanned([active],[],'2026-10-18',retired)[0].id,p.id);
});
test('matching rejects old stations, ambiguous candidates, incomplete details, and distant or different localities',async()=>{
 const {plannedRecords,mergePlanned}=await api(),p=plannedRecords([rows[0]],'2026-10-16')[0],active=activeFrom(p);
 for(const candidates of [
  [activeFrom(p,{firstSeen:'2026-10-15'})],[activeFrom(p,{firstSeen:p.firstSeen})],
  [activeFrom(p,{address:null})],[activeFrom(p,{chargerCount:0})],
  [activeFrom(p,{lat:p.lat+1})],[activeFrom(p,{state:'NY'})],
  [activeFrom(p,{country:'CA'})],[activeFrom(p,{type:'Waypoint'})],
  [active,{...active,id:456,slug:'second',sourceId:'US-RIV-L456'}],
 ]){
  const report={},result=mergePlanned(candidates,[],'2026-10-18',[p],report);
  assert.equal(report.promoted.length,0);assert.equal(report.unresolved.length,1);assert.equal(result.find(a=>a.id===p.id).status,'planned');
 }
});
