const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/location-model.js'),U=require('../js/components.js'),api=require('../scripts/refresh-roamer.cjs'),refresh=require('../scripts/refresh-locations.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const row=(id,name,status='Operational')=>`<article><a href="/charging/sites/${id}">${name}</a><div><span>All EVs</span><span>${status}</span><span>Reliability B</span></div><p>6 chargers</p><p>4 NACS, 2 CCS</p><p>205 kW avg peak</p><dl><dt>Rivian</dt><dd>$0.40</dd><dt>Other EVs</dt><dd>$0.49</dd></dl></article>`;
function network(status='Operational'){return `<span class="text-lime-500">B:100%</span><div data-cluster-map-markers-value='${JSON.stringify([{url:'/charging/sites/US-RIV-L123',coordinates:[37,-120]}])}'></div>`+row('US-RIV-L123','A Place',status);}
test('mode, category and capability filters keep charging and mixed-purpose places distinct',()=>{
 const records=[{id:1,type:'RAN',sourceKind:'charging-map',capabilities:['charging']},{id:2,type:'Waypoint',sourceKind:'charging-map'},{id:3,type:'Demo Center',capabilities:['demo-drive','service']},{id:4,type:'Service Center',capabilities:['service']}];
 assert.deepEqual(M.filterLocations(records,{mode:'charge'}).map(p=>p.id),[1,2]);
 assert.deepEqual(M.filterLocations(records,{mode:'visit',intent:'service'}).map(p=>p.id),[3,4]);
 assert.deepEqual(M.filterLocations(records,{mode:'charge',type:'Waypoint'}).map(p=>p.id),[2]);
});
test('public network parser keeps prices, connectors, power and grades without inventing availability',()=>{
 const [r]=api.parseNetwork(network(),{minimum:1});assert.equal(r.connectorSummary,'4 NACS, 2 CCS');assert.equal(r.rates.Rivian,'$0.40');assert.equal(r.averagePeakKw,205);assert.equal(r.reliabilityGrade,'B');assert.equal(r.reliabilityTone,'lime');assert(!('available' in r));
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

test('RAN cards keep the same information sections for full, partial and unmatched sites',()=>{
 const partial=api.parseNetwork(network(),{minimum:1})[0];
 const full={...partial,hours:'24/7',amenities:['Trailer OK'],detailsObservedAt:'2026-10-14',detailRates:{Idle:'$0.50/min'},chargers:[{name:'1A',connector:'NACS',powerKw:300,features:[]}]};
 for(const roamer of [full,partial,null]){
  const html=U.chargingDetails({type:'RAN',roamer,chargerCount:6,maxKw:300});
  for(const label of ['Connectors','Pricing per kWh','Average Peak Power','Charging Hours','Idle Fee','Site Features','Individual Chargers'])assert(html.includes(label),label);
  if(!roamer?.chargers)assert(html.includes('Individual charger details are not available yet.'));
 }
 assert.doesNotMatch(U.chargingDetails({type:'Waypoint',chargerCount:2,maxKw:11}),/Individual Chargers/);
});

const detailFixture='<main><h1>Station</h1><div class="text-center"><div><div>1</div><div>Stations</div></div><div><div>300</div><div>Max kW</div></div></div><table><tbody><tr><td>1A</td><td>300 kW</td><td>NACS</td><td></td></tr></tbody></table></main>';
function detailImportFixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roamer-coverage-')),cacheDir=path.join(dir,'cache'),output=path.join(dir,'snapshot.json');fs.mkdirSync(cacheDir);
 const markers=Array.from({length:100},(_,i)=>({url:`/charging/sites/US-RIV-L${i}`,coordinates:[37,-120]}));
 fs.writeFileSync(path.join(cacheDir,'network.html'),`<div data-cluster-map-markers-value='${JSON.stringify(markers)}'></div>`+markers.map((m,i)=>row(m.url.split('/').pop(),`Station ${i}`)).join(''));
 return {dir,cacheDir,output};
}
test('detail coverage goes beyond six pages, checkpoints each success and resumes missing sites first',async()=>{
 const f=detailImportFixture(),calls=[],pauses=[];
 const fetchImpl=async url=>{const saved=JSON.parse(fs.readFileSync(f.output));assert.equal(saved.detailCount,calls.length);calls.push(url);return new Response(detailFixture);};
 try{
  const first=await api.refresh({...f,maxDetails:8,fetchImpl,pause:async ms=>pauses.push(ms)});
  assert.equal(first.detailCount,8);assert.equal(first.missingDetailIds.length,92);assert.equal(pauses.length,7);assert(pauses.every(ms=>ms===15000));
  const next=await api.refresh({...f,cacheDir:path.join(f.dir,'next'),maxDetails:0,cacheOnly:true}).catch(()=>null);
  assert.equal(next,null); // No cached network cannot replace the saved coverage.
  fs.mkdirSync(path.join(f.dir,'resume'));fs.copyFileSync(path.join(f.cacheDir,'network.html'),path.join(f.dir,'resume/network.html'));
  const resumed=await api.refresh({...f,cacheDir:path.join(f.dir,'resume'),maxDetails:2,fetchImpl,pause:async()=>{}});
  assert.equal(resumed.detailCount,10);assert(calls[8].endsWith('/US-RIV-L8'));assert(calls[9].endsWith('/US-RIV-L9'));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('detail rate limiting preserves partial progress and stops subsequent requests',async()=>{
 const f=detailImportFixture();let calls=0;
 try{
  const result=await api.refresh({...f,fetchImpl:async()=>++calls===3?new Response('',{status:429,headers:{'Retry-After':'172800'}}):new Response(detailFixture),pause:async()=>{}});
  assert.equal(calls,3);assert.equal(result.detailCount,2);assert.equal(result.rateLimited,true);assert(Date.parse(result.nextRequestAfter)>Date.now()+47*3600000);
  const again=await api.refresh({...f,fetchImpl:async()=>{throw Error('Must honor cooldown');}});assert.equal(again.detailCount,2);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('default daily pass attempts every station detail instead of stopping at six',async()=>{
 const f=detailImportFixture();let calls=0;
 try{
  const result=await api.refresh({...f,fetchImpl:async()=>{calls++;return new Response(detailFixture);},pause:async()=>{}});
  assert.equal(calls,100);assert.equal(result.detailCount,100);assert.deepEqual(result.missingDetailIds,[]);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
