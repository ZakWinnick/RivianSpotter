'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createStore}=require('../js/snapshot-store.js');
function snapshot(revision,label){const x={schemaVersion:1,revision,locations:[{id:1}],charging:[{id:2}],roamer:[],photos:{},updates:{days:[]},changelog:[],summary:{label},chargingSummary:{}};return {...x,snapshotId:crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')};}
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
test('uses the full snapshot identity, including updates with identical iOS revision',async()=>{
 let source=snapshot(7,'first'),cached=null,events=0;const store=createStore({fetchSnapshot:async()=>source,readCache:async()=>cached,writeCache:async x=>{cached=x},digest,onChange:()=>events++});
 await store.refresh();source=snapshot(7,'second');await store.refresh();await store.refresh();assert.equal(events,2);assert.equal(cached.summary.label,'second');
});
test('rejects corrupted or older data and retains the valid offline snapshot',async()=>{
 const cached=snapshot(9,'valid');let source={...snapshot(10,'bad'),snapshotId:'f'.repeat(64)};const store=createStore({fetchSnapshot:async()=>source,readCache:async()=>cached,writeCache:async()=>{throw Error('must not save')},digest});
 assert.equal((await store.refresh()).summary.label,'valid');source=snapshot(8,'old');assert.equal((await store.refresh()).summary.label,'valid');
});
