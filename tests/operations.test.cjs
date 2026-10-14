const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function worker(fetcher = async () => new Response('fresh')) {
  const stores = new Map();
  const listeners = {};
  const key = value => typeof value === 'string' ? new URL(value, 'https://rivianspotter.com').href : value.url;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) { return store.get(key(request))?.clone(); },
        async put(request, response) { store.set(key(request), response.clone()); },
        async delete(request) { return store.delete(key(request)); },
        async keys() { return [...store.keys()].map(url => ({url})); },
        async addAll(urls) { for (const url of urls) store.set(key(url), new Response('shell')); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const context = vm.createContext({ URL, Response, Headers, fetch: fetcher, caches, console,
    self: { location: {origin: 'https://rivianspotter.com'}, addEventListener: (type, fn) => {listeners[type] = fn;}, skipWaiting: async () => {}, clients: {claim: async () => {}} }
  });
  vm.runInContext(read('service-worker.js'), context);
  return {context, stores, listeners, caches, value: expression => vm.runInContext(expression, context)};
}
const request = (pathname, options = {}) => ({url: new URL(pathname, 'https://rivianspotter.com').href, method: 'GET', mode: 'cors', ...options});

// Exercise the deployed worker, rather than a separate policy implementation.
test('precache includes real public files and excludes retired admin paths', () => {
  const w = worker();
  const assets = w.value('STATIC_ASSETS');
  assert.ok(assets.includes('/offline.html'));
  for (const asset of assets) {
    assert.ok(!/admin|api\//.test(asset), 'private paths must not be precached');
    assert.ok(fs.existsSync(path.join(root, asset)), `precache file exists: ${asset}`);
  }
  assert.match(read('service-worker.js'), /2026\.42/);
});

test('only public same-origin GET paths enter cache strategies', () => {
  const w = worker();
  assert.equal(w.value('typeof cachePolicy'), 'function');
  w.context.sampleRequest = request('/');
  assert.equal(w.value('cachePolicy(sampleRequest).strategy'), 'network-first');
  for (const req of [request('/admin', {mode:'navigate'}), request('/admin/', {mode:'navigate'}), request('/admin-new/'), request('/admin.html', {mode:'navigate'}), request('/admin-new.html'), request('/api/locations.php'), request('/contact-handler.php'), request('/data/contact_submissions.json'), request('/?token=secret'), request('https://api.mapbox.com/tiles'), request('/about.html',{method:'POST'}), request('/private.html',{mode:'navigate'})]) {
    w.context.sampleRequest = req;
    assert.equal(w.value('cachePolicy(sampleRequest)'), null, `excluded path ${req.url}`);
  }
  w.context.sampleRequest = request('/locations/seattle/');
  assert.equal(w.value('cachePolicy(sampleRequest).strategy'), 'network-first');
  w.context.sampleRequest = request('/data/locations.json');
  assert.equal(w.value('cachePolicy(sampleRequest).strategy'), 'network-first');
});

test('navigation returns fresh network content and caches it for offline fallback', async () => {
  const w = worker();
  assert.equal(w.value('typeof networkFirst'), 'function');
  w.context.sampleRequest = request('/about.html', {mode: 'navigate'});
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  const response = await w.value('networkFirst(sampleRequest, samplePolicy)');
  assert.equal(await response.text(), 'fresh');
  const cache = await w.caches.open(w.context.samplePolicy.cache);
  assert.equal(await (await cache.match(w.context.samplePolicy.key)).text(), 'fresh');
});

test('network failure returns cached data or the real offline navigation page', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  assert.equal(w.value('typeof networkFirst'), 'function');
  w.context.sampleRequest = request('/locations/unvisited/', {mode:'navigate'});
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  const shell = await w.caches.open(w.value('STATIC_CACHE'));
  await shell.put('/offline.html', new Response('offline page'));
  assert.equal(await (await w.value('networkFirst(sampleRequest, samplePolicy)')).text(), 'offline page');
  w.context.sampleRequest = request('/data/locations.json');
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  const cache = await w.caches.open(w.context.samplePolicy.cache);
  await cache.put(w.context.samplePolicy.key, new Response('last known data'));
  assert.equal(await (await w.value('networkFirst(sampleRequest, samplePolicy)')).text(), 'last known data');
});

test('private responses are not stored and runtime caches have finite entry limits', async () => {
  const w = worker(async () => new Response('private', {headers:{'Cache-Control':'private, no-store'}}));
  assert.equal(w.value('typeof networkFirst'), 'function');
  w.context.sampleRequest = request('/about.html');
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  await w.value('networkFirst(sampleRequest, samplePolicy)');
  assert.equal((await (await w.caches.open(w.context.samplePolicy.cache)).keys()).length, 0);
  assert.equal(w.value('typeof storeResponse'), 'function');
  const cap = w.value('CACHE_LIMITS[PAGE_CACHE]');
  assert.ok(Number.isFinite(cap) && cap > 0 && cap <= 100);
  w.context.sampleResponse = new Response('public');
  for (let i = 0; i < cap + 5; i++) {
    w.context.sampleRequest = request(`/locations/place-${i}/`);
    w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
    await w.value('storeResponse(samplePolicy, sampleResponse)');
  }
  assert.equal((await (await w.caches.open(w.value('PAGE_CACHE'))).keys()).length, cap);
});

test('activation removes legacy caches without touching unrelated sites', async () => {
  const w = worker();
  await w.caches.open('rivianspotter-v1.0.0-mapbox');
  await w.caches.open('unrelated-cache');
  await w.caches.open(w.value('STATIC_CACHE'));
  let completion;
  w.listeners.activate({waitUntil: value => {completion = value;}});
  await completion;
  assert.ok(!w.stores.has('rivianspotter-v1.0.0-mapbox'));
  assert.ok(w.stores.has('unrelated-cache'));
  assert.ok(w.stores.has(w.value('STATIC_CACHE')));
});

test('admin routes hand off to GitHub without exposing a maintenance interface', () => {
  const destination = 'https://github.com/ZakWinnick/RivianSpotter/edit/main/data/locations.json';
  for (const file of ['admin.html', 'admin-new.html']) {
    const html = read(file);
    assert.ok(!/type=["']password|settings\/tokens|adminPassword|Authorization|ADMIN_TOKEN|<form|review-queue|Update a place|canonical inventory/i.test(html));
    assert.ok(html.includes(`content="0; url=${destination}"`));
    assert.ok(html.includes(`href="${destination}"`));
  }
  assert.ok(!fs.existsSync(path.join(root,'js/admin/auth.js')));
  assert.ok(!/Authorization|ADMIN_TOKEN|api\.github\.com|localStorage\.setItem/.test(read('js/admin.js')));
  for (const deniedStorage of [false, true]) {
    const removed = [], redirects = [];
    const window = { location: { search: '?redirect=https://evil.example', replace: url => redirects.push(url) } };
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() {
      if (deniedStorage) throw new Error('Storage denied');
      return { removeItem: name => removed.push(name) };
    }});
    vm.runInNewContext(read('js/admin.js'), {window});
    assert.deepEqual(redirects, [destination]);
    if (!deniedStorage) assert(removed.includes('rivianAdminGitHubToken'));
  }
});

test('retired PHP routes never read credentials, write files, or send email', () => {
  for (const file of ['contact-handler.php', ...fs.readdirSync(path.join(root,'api')).filter(f => f.endsWith('.php')).map(f => `api/${f}`)]) {
    const source = read(file);
    assert.match(source, /http_response_code\(410\)/, `${file} is retired`);
    assert.ok(!/file_put_contents|mail\(|\$_GET|\$_POST|ADMIN_TOKEN|loadEnv/.test(source), `${file} cannot mutate or authenticate`);
  }
});

test('CI blocks on tests, build, and production dependency audit; Pages uses dist', () => {
  const workflows = fs.readdirSync(path.join(root,'.github/workflows')).filter(f => /\.ya?ml$/.test(f)).map(f => read(`.github/workflows/${f}`)).join('\n');
  assert.match(workflows, /node --test tests\/\*\.test\.cjs/);
  assert.match(workflows, /npm run build/);
  assert.match(workflows, /npm audit --omit=dev/);
  // Only optional Roamer retrieval may retain its previous snapshot. Release gates remain blocking.
  const optionalRoamer = 'id: roamer\n        continue-on-error: true\n        run: npm run refresh:roamer';
  assert.equal(workflows.split(optionalRoamer).length, 2);
  assert.ok(!/continue-on-error:\s*true|secrets\./.test(workflows.replace(optionalRoamer, '')));
  assert.doesNotMatch(read('.github/workflows/test.yml'), /contents:\s*write/);
  const refresh = read('.github/workflows/refresh.yml');
  assert.doesNotMatch(refresh, /pull_request|--force/);
  assert.match(refresh, /if: github.ref == 'refs\/heads\/main'/);
  assert(refresh.indexOf('npm run build && npm test') < refresh.indexOf('git push'));
  assert.match(refresh, /needs: refresh/);
  assert.match(refresh, /cancel-in-progress: false/);
  assert.match(workflows, /actions\/deploy-pages@/);
  assert.match(workflows, /path: dist/);
  assert.match(workflows, /needs: build/);
});

test('shared branding and pinned local map vendor assets are public cache paths', () => {
  const w = worker();
  assert.equal(w.value('typeof cachePolicy'), 'function');
  for (const pathname of ['/assets/spotter-mark.svg', '/vendor/mapbox-gl.js', '/vendor/mapbox-gl.css']) {
    w.context.sampleRequest = request(pathname);
    assert.equal(w.value('cachePolicy(sampleRequest)?.strategy'), 'cache-first', pathname);
  }
});

test('offline page provides shared navigation insertion points', () => {
  for (const file of ['offline.html']) {
    const source = read(file);
    assert.ok(source.includes('data-site-header'), `${file} includes header`);
    assert.ok(source.includes('data-site-footer'), `${file} includes footer`);
  }
});

test('denied cache storage cannot hide valid network assets', async () => {
  const w = worker(async () => new Response('uncached stylesheet'));
  assert.equal(w.value('typeof cachePolicy'), 'function');
  w.caches.open = async () => { throw new Error('cache storage denied'); };
  w.context.sampleRequest = request('/css/style.css');
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  const response = await w.value('cacheFirst(sampleRequest, samplePolicy)');
  assert.equal(await response.text(), 'uncached stylesheet');
});

test('release 2026.42.11 installation fetches fresh versioned shell assets', async () => {
  const requests = [];
  const w = worker(async req => { requests.push(req); return new Response('fresh shell'); });
  w.context.Request = Request;
  let completion;
  w.listeners.install({waitUntil: value => {completion = value;}});
  await completion;
  assert.match(w.value('CACHE_VERSION'), /2026\.42\.11$/);
  const assets = w.value('STATIC_ASSETS');
  assert.equal(requests.length, assets.length);
  assert.ok(requests.every(req => req.cache === 'reload' || req.cache === 'no-store'));
  assert.ok(assets.includes('/js/config.js'));
  for (const req of requests) {
    const url = new URL(req.url);
    if (/\.(js|css)$/.test(url.pathname)) assert.equal(url.searchParams.get('v'), '2026.42.11');
  }
});

test('versioned asset cache keys are distinct while data and page keys stay stable', () => {
  const w = worker();
  for (const pathname of ['/js/app.js', '/js/components.js', '/css/style.css', '/js/config.js']) {
    w.context.sampleRequest = request(`${pathname}?v=2026.42.11`);
    assert.equal(w.value('cachePolicy(sampleRequest)?.key'), `https://rivianspotter.com${pathname}?v=2026.42.11`);
  }
  for (const pathname of ['/data/locations.json', '/index.html', '/regions/']) {
    w.context.sampleRequest = request(`${pathname}?v=2026.42.11`);
    assert.equal(w.value('cachePolicy(sampleRequest)?.key'), `https://rivianspotter.com${pathname}`);
  }
});

test('offline cache storage failures still produce a usable network-first response', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  w.caches.open = async () => { throw new Error('cache storage denied'); };
  w.context.sampleRequest = request('/about.html', {mode:'navigate'});
  w.context.samplePolicy = w.value('cachePolicy(sampleRequest)');
  const response = await w.value('networkFirst(sampleRequest, samplePolicy)');
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Offline/);
});

test('installation rejects private shell responses without caching them', async () => {
  const w = worker(async () => new Response('private', {headers:{'Cache-Control':'private, no-store'}}));
  w.context.Request = Request;
  let completion;
  w.listeners.install({waitUntil: value => {completion = value;}});
  await assert.rejects(completion, /Fresh shell unavailable/);
  const shell = await w.caches.open(w.value('STATIC_CACHE'));
  assert.equal((await shell.keys()).length, 0);
});
