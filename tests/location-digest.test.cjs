const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalize,compare,body}=require('../scripts/location-digest.cjs');
const data={locations:[{id:1,name:'Example',slug:'example',type:'Space',city:'Town',state:'CA',lastVerified:'2026-10-19',services:['A','B'],hours:'9–5'}],charging:[],roamer:{stations:[]}};
test('timestamps and source array order do not generate changes',()=>{
 const next=structuredClone(data);next.locations[0].lastVerified='2026-10-20';next.locations[0].services.reverse();
 assert.deepEqual(compare(normalize(data),normalize(next)),[]);
});
test('connector summary ordering is ignored while real counts and unfamiliar descriptions are preserved',()=>{
 const p=normalize(data)[0];p.fields['Connector types']='4 CCS, 2 NACS';
 const reordered=structuredClone(p);reordered.fields['Connector types']='2 NACS, 4 CCS';
 assert.deepEqual(compare([p],[reordered]),[]);
 reordered.fields['Connector types']='3 NACS, 4 CCS';
 assert.deepEqual(compare([p],[reordered])[0].changes,[{field:'Connector types',before:'4 CCS, 2 NACS',after:'3 NACS, 4 CCS'}]);
 reordered.fields['Connector types']='NACS adapters supported';
 assert.equal(compare([p],[reordered])[0].changes.length,1);
});
test('changed and newly published fields include exact before and after values',()=>{
 const next=structuredClone(data);next.locations[0].hours='10–6';next.locations[0].phone='555-1234';
 const changes=compare(normalize(data),normalize(next));assert.equal(changes.length,1);assert.equal(changes[0].kind,'changed');
 assert.deepEqual(changes[0].changes.find(c=>c.field==='Visiting hours'),{field:'Visiting hours',before:'9–5',after:'10–6'});
 assert.deepEqual(changes[0].changes.find(c=>c.field==='Phone'),{field:'Phone',before:null,after:'555-1234'});
});
test('additions, removals and relisting remain distinct',()=>{
 const rows=normalize(data);assert.equal(compare([],rows)[0].kind,'added');assert.equal(compare(rows,[])[0].kind,'no-longer-listed');
 const removed=rows.map(p=>({...p,listed:false}));assert.equal(compare(rows,removed)[0].kind,'no-longer-listed');assert.equal(compare(removed,rows)[0].kind,'relisted');assert.equal(compare([],removed).length,0);
});
test('promotion consumes both old aliases without inventing an addition or removal',()=>{
 const p=normalize(data)[0],planned={...p,fields:{...p.fields,'Location status':'planned'}};
 const active={...p,id:'2'};
 const promoted={...p,aliases:['2'],fields:{...p.fields,'Location status':'open'}};
 const events=compare([planned,active],[promoted]);assert.equal(events.length,1);assert.equal(events[0].kind,'now-active');
});
test('an unknown status after planned is not an opening',()=>{
 const p=normalize(data)[0],planned={...p,fields:{...p.fields,'Location status':'planned'}};
 const unknown={...p,fields:{...p.fields,'Location status':'unknown'}};
 assert.equal(compare([planned],[unknown])[0].kind,'changed');
});
test('price freshness follows the public UI and ignores captures alone',()=>{
 const x=structuredClone(data);x.locations=[];x.charging=[{id:3,slug:'ran',name:'Charger',type:'RAN',sourceId:'s'}];x.roamer.stations=[{sourceId:'s',observedAt:'2026-10-20',detailsObservedAt:'2026-10-19',rates:{Rivian:'$0.40'},detailRates:{Rivian:'$0.30/kWh'}}];
 assert.equal(normalize(x)[0].fields.Pricing.Rivian,'$0.40');
 const next=structuredClone(x);next.roamer.stations[0].detailsObservedAt='2026-10-21';
 assert(compare(normalize(x),normalize(next))[0].changes.some(c=>c.field==='Pricing'));
 next.roamer.stations[0].detailRates.Rivian='$0.40';assert.deepEqual(compare(normalize(x),normalize(next)),[]);
});
test('stale snapshots and incomplete refreshes are disclosed, never called a successful no-change day',()=>{
 const text=body({date:'2026-10-20',previousCapturedAt:'2026-10-19',events:[],snapshot:{sourceDates:{places:'2026-10-19',charging:'2026-10-19',chargingDetails:'2026-10-19T13:00:00Z'},latestRefresh:{status:'completed',conclusion:'failure',url:'https://github.com/example'}}});
 assert.match(text,/Today’s update is delayed/);assert.match(text,/October 19/);assert.doesNotMatch(text,/No location changes today|snapshot|in_progress|github.com|Digest reference|T13:00:00/);
});
const fresh={sourceDates:{places:'2026-10-21',charging:'2026-10-21',chargingDetails:'2026-10-21T13:00:00Z'},latestRefresh:{status:'completed',conclusion:'success'}};
const example={id:'1',name:'Example Station',type:'Rivian Adventure Network',city:'Town',state:'CA',url:'https://rivianspotter.com/locations/example/'};
test('subscriber format states meaningful changes without debug fields or empty totals',()=>{
 const text=body({date:'2026-10-21',snapshot:fresh,events:[{...example,kind:'changed',changes:[{field:'Pricing',before:{Rivian:'$0.40'},after:{Rivian:'$0.45/kWh'}},{field:'Visiting hours',before:'9am–5pm',after:'9am–6pm'}]}]});
 assert.match(text,/1 location updated/);assert.match(text,/\$0.45\/kWh \(previously \$0.40\/kWh\)/);assert.match(text,/9am–6pm \(previously 9am–5pm\)/);assert.match(text,/\[View location\]/);
 assert.doesNotMatch(text,/snapshot|Digest reference|0 new|sourceId|schemaVersion|2026-10-21T/);
});
test('new listings show visit essentials and distinguish coming soon',()=>{
 const text=body({date:'2026-10-21',snapshot:fresh,events:[{...example,kind:'added',changes:[],details:{Address:'100 Main Street','Charger count':8,'Maximum power (kW)':300,'Connector types':'8 NACS','Location status':'planned','Map pin':[37,-120],'Pin precision':'city','Local time zone':'America/Los_Angeles'}}]});
 assert.match(text,/Coming soon/);assert.match(text,/8 chargers · up to 300 kW · 8 NACS/);assert.match(text,/100 Main Street/);assert.doesNotMatch(text,/Map pin|Pin precision|America\/Los_Angeles|37|120/);
});
test('a clean no-change day is short and clear',()=>{
 const text=body({date:'2026-10-21',snapshot:fresh,events:[]});assert.match(text,/No location changes today/);assert(text.length<500);assert.doesNotMatch(text,/delayed|0 newly|coverage|captured/);
});
test('port changes and rate schedule changes remain understandable and complete',()=>{
 const text=body({date:'2026-10-21',snapshot:fresh,events:[{...example,kind:'changed',changes:[{field:'Individual chargers',before:[{name:'1A',connector:'CCS',powerKw:200}],after:[{name:'1A',connector:'NACS',powerKw:300}]},{field:'Pricing',before:{Rivian:'$0.30–0.50/kWh Time-of-Use Rates Mon-Fri 4:00am-8:00am$0.40'},after:{Rivian:'$0.30–0.50/kWh Time-of-Use Rates Mon-Fri 4:00am-8:00am$0.45'}}]}]});
 assert.match(text,/Charger 1A.*NACS, 300 kW.*CCS, 200 kW/);assert.match(text,/time-of-use pricing changed/);assert.match(text,/Current schedule \(local time\)/);assert.match(text,/\$0.45\/kWh/);
});
