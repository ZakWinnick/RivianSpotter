const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/location-model.js'),U=require('../js/components.js'),api=require('../scripts/refresh-roamer.cjs'),refresh=require('../scripts/refresh-locations.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const row=(id,name,status='Operational')=>`<article><a href="/charging/sites/${id}">${name}</a><div><span>All EVs</span><span>${status}</span><span>Reliability B</span></div><p>6 chargers</p><p>4 NACS, 2 CCS</p><p>205 kW avg peak</p><dl><dt>Rivian</dt><dd>$0.40</dd><dt>Other EVs</dt><dd>$0.49</dd></dl></article>`;
function network(status='Operational'){return `<div data-cluster-map-markers-value='${JSON.stringify([{url:'/charging/sites/US-RIV-L123',coordinates:[37,-120]}])}'></div>`+row('US-RIV-L123','A Place',status);}
test('mode, category and capability filters keep charging and mixed-purpose places distinct',()=>{
 const records=[{id:1,type:'RAN',sourceKind:'charging-map',capabilities:['charging']},{id:2,type:'Waypoint',sourceKind:'charging-map'},{id:3,type:'Demo Center',capabilities:['demo-drive','service']},{id:4,type:'Service Center',capabilities:['service']}];
 assert.deepEqual(M.filterLocations(records,{mode:'charge'}).map(p=>p.id),[1,2]);
 assert.deepEqual(M.filterLocations(records,{mode:'visit',intent:'service'}).map(p=>p.id),[3,4]);
 assert.deepEqual(M.filterLocations(records,{mode:'charge',type:'Waypoint'}).map(p=>p.id),[2]);
});
test('public network parser keeps prices, connectors, power and grades without inventing availability',()=>{
 const [r]=api.parseNetwork(network(),{minimum:1});assert.equal(r.connectorSummary,'4 NACS, 2 CCS');assert.equal(r.rates.Rivian,'$0.40');assert.equal(r.averagePeakKw,205);assert.equal(r.reliabilityGrade,'B');assert(!('available' in r));
 assert.throws(()=>api.parseNetwork(network()),/Incomplete/);assert.throws(()=>api.parseNetwork(network()+row('US-RIV-L123','Duplicate'),{minimum:1}),/duplicate/);
 assert.throws(()=>api.parseNetwork(network().replace('coordinates','badCoordinates'),{minimum:1}));
});
test('Roamer enrichment joins exact source IDs and does not replace official specs or coordinates',()=>{
 const c={id:1,type:'RAN',sourceKind:'charging-map',sourceId:'same',lat:37,lng:-120,maxKw:300};
 const [p]=M.combineLocations([],[c],[{sourceId:'same',maxKw:350,lat:40,lng:-70}]);assert.equal(p.maxKw,300);assert.equal(p.lat,37);assert.equal(p.roamer.maxKw,350);
 assert.equal(M.combineLocations([],[c],[{sourceId:'different'}])[0].roamer,null);
});
test('rendered snapshot distinguishes daily issues from live availability and escapes imported text',()=>{
 const r={...api.parseNetwork(network('Inoperable'),{minimum:1})[0],observedAt:'2026-10-14T18:00:00Z',connectorSummary:'<script>bad</script>'};
 const html=U.roamerDetails(r);assert.match(html,/Reported Charger Issue/);assert.match(html,/Oct 14, 2026/);assert.match(html,/205 kW/);assert.match(html,/\$0.40/);assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(U.roamerDetails({...r,reportedStatus:'Unknown'}),/Reported Charger Issue/);
 assert.doesNotMatch(U.roamerDetails({...r,reportedStatus:'Operational'}),/Reported Charger Issue|Operational/);
 assert.equal(U.roamerDetails({...r,sourceUrl:'https://evil.example'}),'');
});
test('official Outpost directions pins survive refresh only while address and link still match',()=>{
 const pins=require('../scripts/location-coordinate-pins.json');
 for(const [slug,pin] of Object.entries(pins)){
  const raw={slug,name:pin.name,address:pin.address,cityLine:`Town, ${pin.state} 12345`,publishedText:'Mon-Sun: 9am-5pm',sourceUrl:pin.source};
  const detail={faq:[],directionsUrl:pin.directions};
  const p=refresh.directoryRecord(raw,detail,[],'2026-10-15');assert.equal(p.lat,pin.lat);assert.equal(p.coordinatePrecision,'map-pin');
  assert.equal(refresh.directoryRecord({...raw,address:'999 Different Street'},detail,[],'2026-10-15').lat,null);
  assert.equal(refresh.directoryRecord(raw,{...detail,directionsUrl:'https://maps.app.goo.gl/changed'},[],'2026-10-15').lat,null);
 }
});
test('daily importer honors persisted cooldown without making any network requests',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roamer-test-')),output=path.join(dir,'snapshot.json');
 const old={stations:[],nextRequestAfter:new Date(Date.now()+86400000).toISOString()};fs.writeFileSync(output,JSON.stringify(old));const original=global.fetch;global.fetch=()=>{throw Error('Network must not be called');};
 try{assert.deepEqual(await api.refresh({output,cacheDir:path.join(dir,'cache')}),old);}finally{global.fetch=original;fs.rmSync(dir,{recursive:true,force:true});}
});

test('detail parser retains individual power, connectors and features but rejects incomplete port tables',()=>{
 const html=`<main><h1>Example Station</h1><div class="text-center"><div><div>1</div><div>Stations</div></div><div><div>300</div><div>Max kW</div></div><div><div>24/7</div><div>Hours</div></div></div><div class="mt-3"><span>Trailer OK</span></div><span>Idle</span><span>$0.50/min (after 10m)</span><table><tbody><tr><td>1A</td><td>300 kW</td><td>NACS</td><td><span data-tooltip-content-value="Credit card reader">Card</span></td></tr></tbody></table></main>`;
 const d=api.parseDetail(html);assert.equal(d.maxKw,300);assert.equal(d.hours,'24/7');assert.deepEqual(d.amenities,['Trailer OK']);assert.equal(d.detailRates.Idle,'$0.50/min (after 10m)');assert.deepEqual(d.chargers,[{name:'1A',powerKw:300,connector:'NACS',features:[{label:'Card',description:'Credit card reader'}]}]);
 assert.throws(()=>api.parseDetail(html.replace('<div>1</div>','<div>2</div>')),/Incomplete/);
 for(const status of ['Unknown','Coming Soon','Operational'])assert.equal(U.hasReportedIssue(status),false);
 for(const status of ['Inoperable','Maintenance','Out of Service'])assert.equal(U.hasReportedIssue(status),true);
});

test('daily snapshots detect grade, pricing and issue changes, preserve older details, and reject inventory loss',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roamer-changes-')),output=path.join(dir,'snapshot.json'),cacheDir=path.join(dir,'cache');fs.mkdirSync(cacheDir);
 const markers=Array.from({length:100},(_,i)=>({url:`/charging/sites/US-RIV-L${i}`,coordinates:[37,-120]}));
 const html=`<div data-cluster-map-markers-value='${JSON.stringify(markers)}'></div>`+markers.map((m,i)=>row(m.url.split('/').pop(),`Station ${i}`,i===0?'Maintenance':'Operational')).join('');
 fs.writeFileSync(path.join(cacheDir,'network.html'),html);
 const stations=api.parseNetwork(html);stations[0].reportedStatus='Operational';stations[0].reliabilityGrade='A';stations[0].rates.Rivian='$0.30';stations[0].hours='24/7';stations[0].detailsObservedAt='2026-01-01T00:00:00Z';
 fs.writeFileSync(output,JSON.stringify({stations,changes:[]}));
 try{
  const result=await api.refresh({output,cacheDir,cacheOnly:true});
  assert.deepEqual(result.changes.map(c=>c.field),['reportedStatus','reliabilityGrade','rates']);assert.equal(result.stations[0].hours,'24/7');assert.equal(result.stations[0].detailsObservedAt,'2026-01-01T00:00:00Z');
  assert.equal((await api.refresh({output,cacheDir,cacheOnly:true})).changes.length,3,'same snapshot does not duplicate changes');
  const prior={stations:[...result.stations,...Array.from({length:50},(_,i)=>({...result.stations[0],sourceId:`US-RIV-L${i+100}`}))]};fs.writeFileSync(output,JSON.stringify(prior));
  await assert.rejects(api.refresh({output,cacheDir,cacheOnly:true}),/inventory loss/);assert.deepEqual(JSON.parse(fs.readFileSync(output)),prior);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('HTTP rate limiting stops immediately and persists cooldown while retaining facts',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roamer-backoff-')),output=path.join(dir,'snapshot.json'),original=global.fetch;
 const old={stations:[{sourceId:'test',hours:'24/7'}],observedAt:'2026-01-01T00:00:00Z'};fs.writeFileSync(output,JSON.stringify(old));let calls=0;
 global.fetch=async()=>{calls++;return {ok:false,status:429,headers:new Headers({'retry-after':'172800'})};};
 try{await assert.rejects(api.refresh({output}),/429/);const retained=JSON.parse(fs.readFileSync(output));assert.deepEqual(retained.stations,old.stations);assert.equal(retained.observedAt,old.observedAt);assert(Date.parse(retained.nextRequestAfter)>Date.now()+47*3600000);await api.refresh({output});assert.equal(calls,1);}finally{global.fetch=original;fs.rmSync(dir,{recursive:true,force:true});}
});
