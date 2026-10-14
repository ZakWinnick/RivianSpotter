/* Public offline cache. Bump release for changes to shell assets. */
const RELEASE = '2026.42.5';
const CACHE_VERSION = `rivianspotter-${RELEASE}`;
const STATIC_CACHE = `${CACHE_VERSION}-shell`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const CACHE_LIMITS = { [STATIC_CACHE]: 24, [PAGE_CACHE]: 40, [DATA_CACHE]: 4, [ASSET_CACHE]: 40 };
const STATIC_ASSETS = ['/index.html', '/offline.html', '/css/style.css', '/js/components.js', '/js/config.js', '/js/location-model.js', '/js/map.js', '/js/app.js', '/js/locations.js', '/assets/spotter-mark.svg'];
const PUBLIC_PAGES = new Set(['/', '/index.html', '/offline.html', '/about.html', '/contact.html', '/stats.html', '/updates.html', '/saved.html', '/regions/']);
const PUBLIC_DATA = new Set(['/data/locations.json', '/data/refresh-summary.json', '/data/location-history.json', '/js/locations.js']);
const PUBLIC_PARAMETERS = new Set(['q', 'type', 'intent', 'state', 'country', 'open', 'saved', 'location', 'view', 'bounds', 'near', 'sort', 'v']);

function cachePolicy(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers?.has('Authorization')) return null;
  if ([...url.searchParams.keys()].some(key => !PUBLIC_PARAMETERS.has(key))) return null;
  const key = `${url.origin}${url.pathname}`;
  if (PUBLIC_DATA.has(url.pathname)) return { strategy: 'network-first', cache: DATA_CACHE, key };
  if (PUBLIC_PAGES.has(url.pathname) || /^\/(locations|regions)\/[a-z0-9-]+\/(?:index\.html)?$/.test(url.pathname)) return { strategy: 'network-first', cache: PAGE_CACHE, key };
  if (STATIC_ASSETS.includes(url.pathname) || ['/manifest.json', '/vendor/mapbox-gl.js', '/vendor/mapbox-gl.css'].includes(url.pathname) || /^\/images\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) return { strategy: 'cache-first', cache: ASSET_CACHE, key: key + (url.searchParams.has('v') ? `?v=${encodeURIComponent(url.searchParams.get('v'))}` : '') };
  return null;
}
async function storeResponse(policy, response) {
  if (!response.ok || response.type === 'opaque' || response.redirected) return;
  if (/private|no-store/i.test(response.headers.get('Cache-Control') || '')) return;
  if (Number(response.headers.get('Content-Length')) > 2 * 1024 * 1024) return;
  const cache = await caches.open(policy.cache);
  await cache.delete(policy.key);
  await cache.put(policy.key, response.clone());
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - CACHE_LIMITS[policy.cache])).map(key => cache.delete(key)));
}
async function networkFirst(request, policy) {
  try {
    const response = await fetch(request);
    try { await storeResponse(policy, response); } catch (_) { /* Storage failure must not hide a valid network result. */ }
    return response;
  } catch (_) {
    try {
      const cache = await caches.open(policy.cache);
      const cached = await cache.match(policy.key);
      if (cached) return cached;
      const shell = await caches.open(STATIC_CACHE);
      const shellResponse = await shell.match(policy.key);
      if (shellResponse) return shellResponse;
      if (request.mode === 'navigate') {
        const offline = await shell.match('/offline.html');
        if (offline) return offline;
      }
    } catch (_) { /* Offline and denied storage still need an explicit response. */ }
    const message = request.mode === 'navigate' ? 'Offline. Reconnect to load this page.' : 'Offline: this resource has not been saved.';
    return new Response(message, {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  }
}
async function cacheFirst(request, policy) {
  try {
    const cached = await (await caches.open(policy.cache)).match(policy.key);
    if (cached) return cached;
    const shellResponse = await (await caches.open(STATIC_CACHE)).match(policy.key);
    if (shellResponse) return shellResponse;
  } catch (_) { /* Cache storage can be denied; still try the network. */ }
  return networkFirst(request, policy);
}
async function installShell() {
  const cache = await caches.open(STATIC_CACHE);
  for (const asset of STATIC_ASSETS) {
    const url = new URL(asset, self.location.origin);
    if (/\.(js|css)$/.test(url.pathname)) url.searchParams.set('v', RELEASE);
    const request = new Request(url.href, {cache: 'reload'});
    const response = await fetch(request);
    if (!response.ok || response.redirected || response.type === 'opaque' || /private|no-store/i.test(response.headers.get('Cache-Control') || '')) throw new Error('Fresh shell unavailable');
    await cache.put(request, response.clone());
    // Support direct source pages as well as versioned production references.
    if (url.search) await cache.put(asset, response.clone());
  }
  await self.skipWaiting();
}
self.addEventListener('install', event => {
  event.waitUntil(installShell());
});
self.addEventListener('activate', event => {
  const current = new Set(Object.keys(CACHE_LIMITS));
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('rivianspotter-') && !current.has(name)).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const policy = cachePolicy(event.request);
  if (!policy) return;
  event.respondWith(policy.strategy === 'network-first' ? networkFirst(event.request, policy) : cacheFirst(event.request, policy));
});
