'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildJsonSnapshot}=require('../scripts/beta-json-snapshot.cjs');
test('publishes only a validated JSON snapshot, route index, catalog and sitemap',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rs-json-')),data=path.join(temp,'data'),out=path.join(temp,'out');fs.mkdirSync(data);
 const records=[{id:1,slug:'one',state:'CA',legacySlugs:['former'],listed:true}];
 for(const [name,content] of Object.entries({'locations.json':records,'charging.json':[],'roamer.json':{stations:[],completedAt:'2026-11-17',coverage:{checkedCount:1}},'location-history.json':{},'location-photos.json':{locations:{},categories:{}},'location-updates.json':{days:[],latestCheck:null},'site-changelog.json':[],'refresh-summary.json':{},'charging-summary.json':{}}))fs.writeFileSync(path.join(data,name),JSON.stringify(content));
 const catalog=Buffer.from(JSON.stringify({schemaVersion:1,revision:8,places:[{id:'1',slug:'one'}]})+'\n');
 try{
  const result=buildJsonSnapshot({dataDir:data,catalog,output:out,combine:()=>records});
  assert.equal(result.catalogRevision,8);assert.match(result.snapshotId,/^[a-f0-9]{64}$/);
  assert.deepEqual(fs.readdirSync(out).sort(),['api','data','sitemap.xml']);
  const routes=JSON.parse(fs.readFileSync(path.join(out,'data/beta-routes.json')));
  assert.equal(routes.locations.one,'one');assert.equal(routes.locations.former,'one');assert.ok(routes.regions.includes('ca'));
  const bundle=JSON.parse(fs.readFileSync(path.join(out,'data/beta-bundle.json')));assert.equal(bundle.snapshotId,result.snapshotId);assert.equal(bundle.revision,8);assert.equal(bundle.roamerReport.completedAt,'2026-11-17');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'data/roamer.json'))).coverage,{checkedCount:1});
  for(const name of ['locations.json','charging.json','roamer.json','charging-summary.json','refresh-summary.json','location-history.json','location-updates.json']) assert.deepEqual(fs.readFileSync(path.join(out,'data',name)),fs.readFileSync(path.join(data,name)));
  assert.deepEqual(fs.readFileSync(path.join(out,'api/v1/catalog.json')),catalog);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('rejects duplicate aliases and incomplete data instead of replacing last good snapshot',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rs-json-'));try{
  const data=path.join(temp,'data');fs.mkdirSync(data);
  for(const [name,value] of Object.entries({'locations.json':[],'charging.json':[],'roamer.json':{stations:[],completedAt:'2026-11-17',coverage:{checkedCount:1}},'location-history.json':{},'location-photos.json':{},'location-updates.json':{days:[]},'site-changelog.json':[],'refresh-summary.json':{},'charging-summary.json':{}}))fs.writeFileSync(path.join(data,name),JSON.stringify(value));
  const catalog=Buffer.from(JSON.stringify({schemaVersion:1,revision:8,places:[{id:'1'}]}));
  assert.throws(()=>buildJsonSnapshot({dataDir:data,catalog,output:path.join(temp,'out'),combine:()=>[{id:1,slug:'a',state:'CA',legacySlugs:['dup']},{id:2,slug:'b',state:'CA',legacySlugs:['dup']}]}),/duplicate|alias/i);
  assert.equal(fs.existsSync(path.join(temp,'out')),false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
