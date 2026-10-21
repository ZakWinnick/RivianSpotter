const test=require('node:test'),assert=require('node:assert/strict');
const {publicEntry,append}=require('../scripts/update-location-feed.cjs');
const {renderFeed}=require('../scripts/build-location-updates.cjs');
const event=(changes=[],kind='changed')=>({eventId:'a'.repeat(64),id:'test',name:'Test Station',type:'Rivian Adventure Network',city:'Test',state:'CA',url:'https://rivianspotter.com/locations/test/',kind,changes});
const options={date:'2026-10-21',sourceDates:{places:'2026-10-21',charging:'2026-10-21'}};
const empty=()=>({schemaVersion:1,days:[]});
test('public updates omit map pin and precision changes, including pin-only entries',()=>{
 const pins=[{field:'Map pin',before:[1,2],after:[3,4]},{field:'Pin precision',before:'city',after:'exact'}];
 assert.equal(publicEntry(event(pins)),null);
 const entry=publicEntry(event([...pins,{field:'Charger count',before:4,after:8}]));
 assert.deepEqual(entry.lines,['Charger count: 8 (previously 4).']);
 const feed=append(empty(),[event(pins)],options);assert.equal(feed.days.length,0);assert.equal(feed.latestCheck.date,options.date);
});
test('daily public feed deduplicates events without discarding history',()=>{
 const one=append(empty(),[event([{field:'Charger count',before:4,after:8}])],options);
 assert.deepEqual(append(one,[event([{field:'Charger count',before:4,after:8}])],options),one);
 const two=append(one,[],{...options,date:'2026-10-22'});assert.equal(two.days.length,1);assert.equal(two.latestCheck.date,'2026-10-22');
 assert.throws(()=>append(two,[],options),/backward/);
});
test('coming soon and opening events survive pin exclusion',()=>{
 const added={...event([],'added'),details:{'Location status':'planned'}};
 assert.equal(publicEntry(added).kind,'coming-soon');
 assert.equal(publicEntry(event([],'now-active')).kind,'now-active');
});
test('public feed allowlists fields and blocks foreign links',()=>{
 const e={...event([],'added'),email:'private@example.com',snapshot:{secret:true},details:{Address:'123 Main St'}};
 const entry=publicEntry(e);assert.ok(!JSON.stringify(entry).includes('private'));assert.ok(!('snapshot' in entry));assert.equal(entry.url,'/locations/test/');
 assert.throws(()=>publicEntry({...e,url:'https://evil.example/locations/test/'}),/Invalid/);
});
test('rendered feed escapes source text, preserves details and offers filters',()=>{
 const e=event([{field:'Visiting hours',before:null,after:'<script>alert(1)</script>'}]);
 const html=renderFeed(append(empty(),[e],options));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
 assert.ok(html.includes('update-search'));assert.ok(html.includes('update-type'));assert.ok(html.includes('/changelog.html'));
});
test('seeded public feed has no pin-only announcements or private delivery data',()=>{
 const feed=require('../data/location-updates.json');
 assert.ok(feed.days.flatMap(d=>d.entries).every(e=>!e.lines.some(l=>/^Map location:/.test(l))));
 assert.ok(!/zak@|submissionId|alreadySent|send-response/.test(JSON.stringify(feed)));
});
