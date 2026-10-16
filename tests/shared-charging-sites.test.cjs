const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const M=require('../js/location-model.js'),U=require('../js/components.js');
const chargers=require('../data/charging.json'),observations=require('../data/roamer.json').stations;
const {buildPages}=require('../scripts/build-pages.cjs');
const ran={id:1,slug:'fast',type:'RAN',sourceId:'fast',sourceKind:'charging-map',name:'Example',address:'100 Main Street',city:'Town',state:'CA',country:'US',lat:37,lng:-120,coordinatePrecision:'map-pin',chargerCount:6,maxKw:300};
const waypoint={...ran,id:2,slug:'level-2',type:'Waypoint',sourceId:'slow',chargerCount:3,maxKw:11};

test('shared charging sites retain each network and resolve saved legacy IDs under either filter',()=>{
 const inputs=[ran,{...waypoint,legacyIds:[3],legacySlugs:['older-level-2']}],before=JSON.stringify(inputs);
 const [p]=M.combineLocations([],inputs,[{sourceId:'fast',hours:'24/7'},{sourceId:'slow',hours:'9–5'}]);
 assert.equal(JSON.stringify(inputs),before,'canonical source records must not change');
 assert.equal(p.id,ran.id);assert.deepEqual(p.legacyIds,[2,3]);assert.deepEqual(p.legacySlugs,['level-2','older-level-2']);
 assert.deepEqual(p.chargingNetworks.map(c=>[c.sourceId,c.chargerCount,c.maxKw,c.roamer.hours]),[['fast',6,300,'24/7'],['slow',3,11,'9–5']]);
 for(const type of ['RAN','Waypoint'])assert.equal(M.filterLocations([p],{type,savedOnly:true,savedIds:[2]}).length,1);
 assert.equal(M.chargingSummary(p),'6 fast chargers · 3 Level 2 chargers');
 assert.equal(U.locationTypeLabel(p),'Rivian Adventure Network + Waypoint');
 const updated=M.combineLocations([],[ran,{...waypoint,chargerCount:5}],[{sourceId:'fast',hours:'6–10'}])[0];
 assert.equal(updated.chargingNetworks[1].chargerCount,5);assert.equal(updated.chargingNetworks[0].roamer.hours,'6–10');
});

test('colocation requires matching published addresses and nearby exact pins, with no ambiguous merges',()=>{
 assert.equal(M.groupChargingSites([ran,{...waypoint,address:'100 MAIN STREET, Town, CA'}]).length,1);
 for(const override of [{address:'102 Main Street'},{city:'Elsewhere'},{state:'NV'},{country:'CA'},{lat:38},{status:'planned'},{listed:false},{coordinatePrecision:'city'},{address:null}]){
  assert.equal(M.groupChargingSites([ran,{...waypoint,...override}]).length,2,JSON.stringify(override));
 }
 assert.equal(M.groupChargingSites([ran,waypoint,{...waypoint,id:3}]).length,3);
 assert.equal(M.groupChargingSites([ran,waypoint,{...ran,id:3}]).length,3);
});

test('inventory-wide grouping covers Las Vegas and Corte Madera and preserves every source and old URL',()=>{
 const grouped=M.combineLocations([],chargers,observations),pairs=grouped.filter(p=>p.chargingNetworks);
 assert(pairs.length>2,'grouping must scan the whole inventory');
 for(const city of ['Las Vegas','Corte Madera'])assert(pairs.some(p=>p.city===city),city);
 const members=grouped.flatMap(p=>p.chargingNetworks||[p]);
 assert.deepEqual(members.map(p=>p.sourceId).sort(),chargers.map(p=>p.sourceId).sort());
 for(const p of pairs){assert.deepEqual(M.locationTypes(p),['RAN','Waypoint']);assert(M.distanceMiles(...p.chargingNetworks)<=0.15);}
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shared-charging-'));
 try{
  buildPages(dir,grouped,require('../data/refresh-summary.json'));
  for(const c of chargers)assert(fs.existsSync(path.join(dir,M.locationUrl(c),'index.html')),c.slug);
  for(const p of pairs){
   const alias=fs.readFileSync(path.join(dir,M.locationUrl(p.chargingNetworks[1]),'index.html'),'utf8');
   assert(alias.includes(`href="https://rivianspotter.com${M.locationUrl(p)}"`));
   assert(alias.includes('Rivian Adventure Network + Waypoint'));
   assert(alias.includes('DC Fast Charging')&&alias.includes('Level 2 Charging'));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('rate formatting keeps ranges compact and retains every published schedule period',()=>{
 let schedules=0;
 for(const r of observations){
  for(const value of Object.values(r.detailRates||{})){
   if(!/Time-of-Use Rates/i.test(value))continue;
   schedules++;
   const p=U.parseRate(value);
   assert(p.periods.length>0,r.sourceId);assert.equal(p.note,null,r.sourceId);
   assert(!p.summary.includes('/kWh')&&!p.summary.includes('Time-of-Use'));
   assert.equal(p.periods.length,(value.split('Time-of-Use Rates')[1].match(/\$/g)||[]).length,r.sourceId);
  }
  const html=U.roamerDetails(r),cards=html.match(/<dl class="charging-prices">([\s\S]*?)<\/dl>/)?.[1]||'';
  assert.doesNotMatch(cards,/Time-of-Use|Mon-Fri|Sat-Sun/);
  for(const dd of cards.matchAll(/<dd>(.*?)<\/dd>/g))assert((dd[1].match(/\/kWh/g)||[]).length<=1,r.sourceId);
 }
 assert(schedules>0);
});

test('flat, energy-only, unavailable and unfamiliar rate schedules stay readable and escaped',()=>{
 assert.deepEqual(U.parseRate('$0.59/kWh'),{summary:'$0.59',periods:[],note:null});
 assert.deepEqual(U.parseRate(null),{summary:null,periods:[],note:null});
 const base={sourceUrl:'https://rivianroamer.com/charging/sites/US-RIV-L1',detailsObservedAt:'2026-10-16',detailRates:{Energy:'$0.59/kWh'}};
 const flat=U.roamerDetails(base);assert.match(flat,/\$0.59<small>\/kWh/);assert.doesNotMatch(flat,/rate-schedule/);
 const unknown=U.roamerDetails({...base,detailRates:{Energy:'$0.30–0.60/kWh Time-of-Use Rates Holiday <script>special</script>'}});
 assert.match(unknown,/Holiday &lt;script&gt;special&lt;\/script&gt;/);assert.doesNotMatch(unknown,/<script>/);
 assert.match(unknown,/<dd>\$0.30–0.60<small>\/kWh/);
});
