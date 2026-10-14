const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const M=require('../js/location-model.js');
const records=require('../data/locations.json');
const summary=require('../data/refresh-summary.json');
const {buildPages}=require('../scripts/build-pages.cjs');
const {serviceRecord}=require('../scripts/refresh-locations.cjs');
test('every location link points to its own official page or an accurately labeled shared directory',()=>{
 for(const p of records){
  const link=M.getOfficialLink(p);
  assert(link,p.slug);
  if(p.sourceKind==='directory'){
   const raw=summary.officialDirectory.find(x=>x.slug===p.slug);
   assert.equal(link.url,raw.sourceUrl,p.slug);
   assert.equal(link.locationSpecific,true);
  }else{
   assert.equal(link.locationSpecific,false,p.slug);
   assert(!link.url.includes('/calgary'),p.slug);
   assert.notEqual(link.label,'Official location');
  }
 }
 const oldCached={...records.find(p=>p.sourceKind==='service-map'),rivianUrl:'https://rivian.com/spaces/calgary-service-demo-center'};
 assert.equal(M.getOfficialLink(oldCached).url,'https://rivian.com/experience/service#map');
 const imported=serviceRecord({properties:{name:'Sunnyvale',city:'Sunnyvale',stateOrProvince:'CA',address:'925 Morse Avenue',country:'US',status:'live'}},'2026-10-14');
 assert.equal(imported.rivianUrl,null);
});
test('generated pages contain no review warnings or cross-location official links',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spotter-public-'));
 try{
  const routes=buildPages(dir,records,summary);
  for(const route of routes){
   const html=fs.readFileSync(path.join(dir,route,route.endsWith('/')?'index.html':''),'utf8');
   assert.doesNotMatch(html,/needs? confirmation|need review|awaiting.*verification|verification queue|visible uncertainty|details need|no current source match/i,route);
  }
  for(const p of records){
   const html=fs.readFileSync(path.join(dir,M.locationUrl(p),'index.html'),'utf8');
   const urls=[...html.matchAll(/(?:href="|"sameAs":")(https:\/\/rivian\.com\/spaces\/[^"#]+)["#]/g)].map(x=>x[1]);
   assert(urls.every(url=>url===M.getOfficialLink(p).url),p.slug);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('current directory address supplies directions when detail-page coordinates are stale',()=>{
 const p=records.find(x=>x.slug==='scottsdale');
 const url=new URL(M.getDirectionsUrl(p));
 assert.equal(url.searchParams.get('destination'),`${p.address}, ${p.city}, ${p.state}`);
});
