import router from './beta-data-router.cjs';

const CATALOG_ORIGIN = 'https://production-data.d3qy7654vf25z2.amplifyapp.com';
const PERFORMANCE = 'https://raw.githubusercontent.com/ZakWinnick/RivianSpotter/beta-ran-data/ran-performance.json';
const routeCache = {};

// The beta web design has its own origin. Its base catalog follows the daily
// production publication, while the beta-only measurements publish separately.
function upstream(request) {
  const url = new URL(request.url);
  if (url.origin === router.DATA_ORIGIN) {
    url.host = new URL(CATALOG_ORIGIN).host;
    return fetch(new Request(url, request));
  }
  return fetch(request);
}

function responseWithPreviewHeaders(response, request) {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    headers,
  });
}

async function performance(request) {
  const response = await fetch(PERFORMANCE, {method: request.method, redirect: 'error'});
  if (!response.ok) return new Response(null, {status: 503, headers: {'Cache-Control': 'no-store'}});
  return new Response(response.body, {headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=60',
  }});
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname !== router.BETA_HOST) return new Response('Not found', {status: 404});
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
    let response;
    try {
      if (url.pathname === '/data/ran-performance.json') response = await performance(request);
      else if (/^\/data\/[a-z0-9-]+\.json$/.test(url.pathname) && url.pathname !== '/data/site-changelog.json') {
        response = await fetch(new URL(url.pathname, CATALOG_ORIGIN), {method: request.method, redirect: 'manual'});
      } else {
        response = await router.handleRequest(request, {mode: 'dynamic', fetcher: upstream, routeCache});
        if (!response) response = await fetch(new URL(url.pathname + url.search, router.SHELL_ORIGIN), {
          method: request.method, redirect: 'manual',
        });
      }
    } catch {
      response = new Response(null, {status: 503, headers: {'Cache-Control': 'no-store'}});
    }
    return responseWithPreviewHeaders(response, request);
  },
};
