'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {handleRequest}=require('../scripts/production-data-router.cjs');
const data='https://production-data.d3qy7654vf25z2.amplifyapp.com',shell='https://production-shell.d3qy7654vf25z2.amplifyapp.com';
test('routes only production and uses a valid shared shell for known canonical and alias paths',async()=>{
 const requests=[],routes={schemaVersion:1,snapshotId:'a'.repeat(64),locations:{known:'known',old:'known'},regions:['ca']};
 const fetcher=async req=>{requests.push(req.url);return req.url.endsWith('/data/beta-routes.json')?Response.json(routes):new Response('shared shell',{headers:{'Content-Type':'text/html'}});};
 const alias=await handleRequest(new Request('https://rivspotter.com/locations/old/'),{fetcher});assert.equal(alias.status,200);assert.equal(await alias.text(),'shared shell');assert.deepEqual(requests,[data+'/data/beta-routes.json',shell+'/dynamic.html']);
 assert.equal(await handleRequest(new Request('https://beta.rivspotter.com/locations/old/'),{fetcher}),null);
});
test('missing locations produce 404 and unavailable route data fails closed',async()=>{
 const index={schemaVersion:1,snapshotId:'a'.repeat(64),locations:{known:'known'},regions:['ca']};
 const missing=await handleRequest(new Request('https://rivspotter.com/locations/missing/'),{fetcher:async()=>Response.json(index)});assert.equal(missing.status,404);
 const failed=await handleRequest(new Request('https://rivspotter.com/locations/known/'),{fetcher:async()=>new Response('bad',{status:500})});assert.equal(failed.status,503);
});
test('same-host catalog is fetched only from the dedicated production data origin',async()=>{
 let url;const result=await handleRequest(new Request('https://rivspotter.com/api/v1/catalog.json'),{fetcher:async req=>{url=req.url;return new Response('{}',{headers:{'Content-Type':'application/json'}})}});
 assert.equal(url,data+'/api/v1/catalog.json');assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/application\/json/);
});
test('ordinary shell assets route to the isolated production shell and retain the query',async()=>{
 let url;const result=await handleRequest(new Request('https://rivspotter.com/css/style.css?v=release'),{fetcher:async req=>{url=req.url;return new Response('css',{headers:{'Content-Type':'text/css'}})}});
 assert.equal(url,shell+'/css/style.css?v=release');assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/text\/css/);
});
test('keeps redirects on the public host and blocks redirects to external hosts',async()=>{
 const request=new Request('https://rivspotter.com/missing.html');
 const good=await handleRequest(request,{fetcher:async()=>new Response(null,{status:301,headers:{location:shell+'/missing/'}})});
 assert.equal(good.status,301);assert.equal(good.headers.get('location'),'https://rivspotter.com/missing/');
 const bad=await handleRequest(request,{fetcher:async()=>new Response(null,{status:301,headers:{location:'https://example.com/'}})});assert.equal(bad.status,503);
});
test('legacy public data endpoints use the same production snapshot origin',async()=>{
 for(const path of ['/data/locations.json','/data/charging.json','/data/roamer.json','/data/charging-summary.json','/data/refresh-summary.json','/data/location-history.json','/data/location-updates.json']){
  let got;const response=await handleRequest(new Request('https://rivspotter.com'+path),{fetcher:async req=>{got=req.url;return Response.json({});}});
  assert.equal(got,data+path);assert.equal(response.status,200);
 }
});
