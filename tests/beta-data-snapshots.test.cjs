'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSnapshot } = require('../scripts/beta-data-snapshot.cjs');
const { routePath, handleRequest } = require('../scripts/beta-data-router.cjs');

test('builds a content-addressed data snapshot without shell or vendor files', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'riv-beta-'));
  const dist = path.join(temp, 'dist');
  function put(p, text) { const f = path.join(dist, p); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f, text); }
  try {
    put('api/v1/catalog.json', JSON.stringify({schemaVersion:1,revision:100,places:[{id:'1'}]}));
    put('data/locations.json', '[]'); put('data/charging.json', '[]'); put('data/roamer.json', '{"stations":[]}');
    put('locations/a/index.html', '<link href="/css/style.css?v=data-1"><script src="/js/app.js?v=data-1"></script>'); put('locations/index.html', 'gallery');
    put('regions/index.html', 'regions'); put('updates.html', 'updates'); put('stats.html', 'stats');
    put('sitemap.xml','<urlset/>');
    put('js/locations.js','l'); put('js/charging.js','c'); put('js/roamer.js','r');
    put('js/app.js','  async function load() {\n    try { /* old */\n    all = M.combineLocations(all, chargers, roamer);\n}');
    put('service-worker.js',"const RELEASE = 'old';\nconst PUBLIC_DATA = new Set(['/data/locations.json']);");
    put('index.html','site shell'); put('vendor/mapbox-gl.js','vendor');
    const first = buildSnapshot(dist, path.join(temp,'snapshot'),{shellRelease:'2026.47.0-270f5b1dd20f'});
    assert.match(first.snapshot, /^[a-f0-9]{64}$/);
    assert.equal(first.catalogRevision, 100);
    assert.ok(fs.existsSync(path.join(temp,'snapshot','files','locations','a','index.html')));
    assert.ok(!fs.existsSync(path.join(temp,'snapshot','files','index.html')));
    assert.ok(!fs.existsSync(path.join(temp,'snapshot','files','vendor')));
    assert.equal(buildSnapshot(dist, path.join(temp,'again'),{shellRelease:'2026.47.0-270f5b1dd20f'}).snapshot, first.snapshot);
    assert.match(fs.readFileSync(path.join(temp,'snapshot/files/service-worker.js'),'utf8'), /\/js\/charging\.js/);
    assert.match(fs.readFileSync(path.join(temp,'snapshot/files/js/app.js'),'utf8'), /\/data\/beta-bundle\.json/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp,'snapshot/files/data/beta-bundle.json'),'utf8')).locations, []);
    assert.match(fs.readFileSync(path.join(temp,'snapshot/files/locations/a/index.html'),'utf8'), /style\.css\?v=2026\.47\.0-270f5b1dd20f/);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});

test('proxy passes conditional validators without forwarding private headers', async () => {
  let sent;
  const result=await handleRequest(new Request('https://beta.rivspotter.com/api/v1/catalog.json',{headers:{'If-None-Match':'"v1"','Cookie':'private'}}), {origin:'https://beta-data.d3qy7654vf25z2.amplifyapp.com',fetcher:async req=>{sent=req;return new Response(null,{status:304,headers:{ETag:'"v1"'}});}});
  assert.equal(result.status,304); assert.equal(result.headers.get('etag'),'"v1"');
  assert.equal(sent.headers.get('if-none-match'),'"v1"'); assert.equal(sent.headers.has('cookie'),false);
});

test('routes only public beta data and generated pages, rejecting ambiguous paths', () => {
  assert.equal(routePath('/api/v1/catalog.json'),'api/v1/catalog.json');
  assert.equal(routePath('/locations/new-place/'),'locations/new-place/index.html');
  assert.equal(routePath('/locations/new-place'),'locations/new-place/index.html');
  assert.equal(routePath('/regions/ca/'),'regions/ca/index.html');
  assert.equal(routePath('/updates.html'),'updates.html');
  assert.equal(routePath('/sitemap.xml'),'sitemap.xml');
  assert.equal(routePath('/js/charging.js'),'js/charging.js');
  assert.equal(routePath('/js/roamer.js'),'js/roamer.js');
  assert.equal(routePath('/js/app.js'),'js/app.js');
  assert.equal(routePath('/service-worker.js'),'service-worker.js');
  assert.equal(routePath('/js/map.js'),null);
  assert.equal(routePath('/data/../../admin'),null);
});

test('beta proxy never falls through for missing new or removed locations', async () => {
  const requests = [];
  const fetcher = async req => {
    requests.push(req.url);
    return new Response('missing', {status:404});
  };
  const result = await handleRequest(new Request('https://beta.rivspotter.com/locations/new-place/'), {origin:'https://beta-data.d3qy7654vf25z2.amplifyapp.com',fetcher});
  assert.equal(result.status,404);
  assert.deepEqual(requests,['https://beta-data.d3qy7654vf25z2.amplifyapp.com/locations/new-place/index.html']);
  const production = await handleRequest(new Request('https://rivspotter.com/locations/new-place/'), {origin:'https://beta-data.d3qy7654vf25z2.amplifyapp.com',fetcher});
  assert.equal(production, null);
});

test('proxy returns unavailable instead of serving stale data when the data origin fails', async () => {
  const result = await handleRequest(new Request('https://beta.rivspotter.com/api/v1/catalog.json'), {origin:'https://beta-data.d3qy7654vf25z2.amplifyapp.com',fetcher:async()=>new Response('failure',{status:500})});
  assert.equal(result.status,503);
});
