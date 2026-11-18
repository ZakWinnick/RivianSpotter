(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpotterSnapshot=api.browser();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function createStore({fetchSnapshot,readCache,writeCache,digest,onChange=()=>{}}){
  let current=null,initialized=false,inflight=null;
  async function valid(x){
   if(!x||x.schemaVersion!==1||!Number.isSafeInteger(x.revision)||x.revision<=0||!/^[a-f0-9]{64}$/.test(x.snapshotId||'')||!Array.isArray(x.locations)||!x.locations.length||!Array.isArray(x.charging)||!Array.isArray(x.roamer)||!x.updates||!Array.isArray(x.updates.days)||!x.photos||!x.summary||!x.chargingSummary)return false;
   const {snapshotId,...payload}=x;return await digest(JSON.stringify(payload))===snapshotId;
  }
  async function refresh(){
   if(inflight)return inflight;
   inflight=(async()=>{
    if(!initialized){initialized=true;try{const cached=await readCache();if(await valid(cached))current=cached;}catch{}}
    try{
     const next=await fetchSnapshot();
     if(!await valid(next)||current&&next.revision<current.revision)throw Error('Invalid or older directory snapshot');
     if(!current||next.snapshotId!==current.snapshotId){current=next;try{await writeCache(next);}catch{}onChange(next);}
    }catch(error){if(!current)throw error;}
    return current;
   })().finally(()=>{inflight=null;});return inflight;
  }
  return {refresh,get:()=>current};
 }
 function browser(){
  const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
  const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('rivspotter-public-snapshot',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const transaction=async(mode,action)=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots',mode),req=action(tx.objectStore('snapshots'));let value;req.onsuccess=()=>{value=req.result;};req.onerror=()=>reject(req.error);tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=()=>{db.close();reject(tx.error);};});};
  const store=createStore({digest,readCache:()=>transaction('readonly',s=>s.get('last-good')),writeCache:x=>transaction('readwrite',s=>s.put(x,'last-good')),fetchSnapshot:async()=>{const r=await fetch('/data/beta-bundle.json',{cache:'no-cache'});if(!r.ok)throw Error('Snapshot unavailable');return r.json();},onChange:x=>document.dispatchEvent(new CustomEvent('spotter:snapshot',{detail:x}))});
  let last=0;async function check(){if(document.hidden||Date.now()-last<30000)return;last=Date.now();try{await store.refresh();}catch{}}
  document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);setInterval(check,300000);
  return store;
 }
 return {createStore,browser};
});
