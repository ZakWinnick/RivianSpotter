'use strict';

const BETA_HOST = 'beta.rivspotter.com';
const DATA_ORIGIN = 'https://beta-data.d3qy7654vf25z2.amplifyapp.com';
const SHELL_ORIGIN = 'https://beta.d3qy7654vf25z2.amplifyapp.com';
const ROUTE_INDEX = 'data/beta-routes.json';
const SHARED_PAGE = 'dynamic.html';
const ROUTE_INDEX_TTL_MS = 30_000;
const BETA_DATA_PATHS = new Set([
  '/api/v1/catalog.json',
  '/data/beta-bundle.json',
  '/data/beta-routes.json',
  '/sitemap.xml',
]);

function routePath(path) {
  if (path === '/api/v1/catalog.json' || path === '/sitemap.xml' ||
      /^\/data\/[a-z0-9-]+\.json$/.test(path)) return path.slice(1);
  if (['/service-worker.js','/js/app.js','/js/locations.js','/js/charging.js','/js/roamer.js',
    '/updates.html','/stats.html'].includes(path)) return path.slice(1);
  if (/^\/(locations|regions)\/$/.test(path)) return path.slice(1) + 'index.html';
  if (/^\/(locations|regions)\/[a-z0-9-]+(?:\/index\.html|\/)?$/.test(path)) {
    return path.slice(1).replace(/\/index\.html$/, '').replace(/\/$/, '') + '/index.html';
  }
  return null;
}

function dynamicPage(path) {
  if (['/updates.html', '/stats.html'].includes(path) ||
      /^\/(locations|regions)(?:\/(?:index\.html)?)?$/.test(path)) return {};
  const match = /^\/(locations|regions)\/([a-z0-9-]+)(?:\/index\.html|\/)?$/.exec(path);
  return match ? { section: match[1], key: match[2] } : null;
}

function validateRouteIndex(index) {
  if (index?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(index.snapshotId) ||
      !index.locations || typeof index.locations !== 'object' || Array.isArray(index.locations) ||
      !Array.isArray(index.regions) || !index.regions.length) throw new Error('Invalid route index');
  const locations = Object.entries(index.locations);
  if (!locations.length || locations.some(([slug, canonical]) =>
    !/^[a-z0-9-]+$/.test(slug) || typeof canonical !== 'string' ||
    !Object.hasOwn(index.locations, canonical) || index.locations[canonical] !== canonical
  ) || index.regions.some(value => typeof value !== 'string' || !/^[a-z]{2}$/.test(value))) {
    throw new Error('Invalid route index entries');
  }
  return { locations: new Set(locations.map(([slug]) => slug)), regions: new Set(index.regions) };
}

async function readRouteIndex(origin, fetcher, cache) {
  const now = Date.now();
  if (cache?.expiresAt > now) return cache.index;
  const response = await fetcher(new Request(`${origin}/${ROUTE_INDEX}`, { redirect: 'manual' }));
  if (response.status !== 200) throw new Error('Route index unavailable');
  const index = validateRouteIndex(await response.json());
  if (cache) Object.assign(cache, { index, expiresAt: now + ROUTE_INDEX_TTL_MS });
  return index;
}

function contentType(target) {
  if (target.endsWith('.json')) return 'application/json; charset=utf-8';
  if (target.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (target.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return 'text/html; charset=utf-8';
}

async function proxy(request, origin, target, fetcher, { sharedPage = false } = {}) {
  const headers = new Headers();
  for (const name of ['if-none-match', 'if-modified-since']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  const response = await fetcher(new Request(`${origin}/${target}`, {
    method: request.method,
    headers,
    redirect: 'manual',
  }));
  const allowedStatuses = sharedPage ? [200, 304] : [200, 304, 404];
  if (!allowedStatuses.includes(response.status)) throw new Error('Unavailable object');
  const out = new Headers({
    'Cache-Control': 'public, max-age=0, s-maxage=60, must-revalidate',
    'Content-Type': contentType(target),
  });
  for (const name of ['etag', 'last-modified']) {
    if (response.headers.has(name)) out.set(name, response.headers.get(name));
  }
  return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers: out });
}

function errorResponse(request, status) {
  const message = status === 404 ? 'Page not found' : 'Data service unavailable';
  return new Response(request.method === 'HEAD' ? null : message, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function handleRequest(request, {
  origin = DATA_ORIGIN,
  shellOrigin = SHELL_ORIGIN,
  mode = 'legacy',
  fetcher = fetch,
  routeCache,
} = {}) {
  const url = new URL(request.url);
  if (url.hostname !== BETA_HOST || !['GET', 'HEAD'].includes(request.method)) return null;

  try {
    if (mode !== 'dynamic') {
      const target = routePath(url.pathname);
      if (!target) return null;
      if (origin !== DATA_ORIGIN) throw new Error('Invalid data origin');
      return await proxy(request, origin, target, fetcher);
    }

    if (BETA_DATA_PATHS.has(url.pathname)) {
      if (origin !== DATA_ORIGIN) throw new Error('Invalid data origin');
      return await proxy(request, origin, url.pathname.slice(1), fetcher);
    }

    const page = dynamicPage(url.pathname);
    if (!page) return null;
    if (origin !== DATA_ORIGIN || shellOrigin !== SHELL_ORIGIN) throw new Error('Invalid beta origins');
    if (page.section) {
      const routes = await readRouteIndex(origin, fetcher, routeCache);
      if (!routes[page.section].has(page.key)) return errorResponse(request, 404);
    }
    return await proxy(request, shellOrigin, SHARED_PAGE, fetcher, { sharedPage: true });
  } catch {
    return errorResponse(request, 503);
  }
}

module.exports = { BETA_HOST, DATA_ORIGIN, SHELL_ORIGIN, routePath, handleRequest };
