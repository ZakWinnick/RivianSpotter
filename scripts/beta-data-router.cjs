'use strict';
function routePath(path) {
  if (path === '/api/v1/catalog.json') return 'api/v1/catalog.json';
  if (path === '/sitemap.xml') return 'sitemap.xml';
  if (/^\/data\/[a-z0-9-]+\.json$/.test(path)) return path.slice(1);
  if (['/service-worker.js','/js/app.js','/js/locations.js','/js/charging.js','/js/roamer.js'].includes(path)) return path.slice(1);
  if (path === '/updates.html' || path === '/stats.html') return path.slice(1);
  if (/^\/(locations|regions)\/$/.test(path)) return path.slice(1)+'index.html';
  if (/^\/(locations|regions)\/[a-z0-9-]+(?:\/index\.html|\/)?$/.test(path)) return path.slice(1).replace(/\/index\.html$/, '').replace(/\/$/,'')+'/index.html';
  return null;
}
async function handleRequest(request,{origin,fetcher=fetch}) {
  const url=new URL(request.url), target=routePath(url.pathname);
  if (url.hostname !== 'beta.rivspotter.com' || !target || !['GET','HEAD'].includes(request.method)) return null;
  if (origin !== 'https://beta-data.d3qy7654vf25z2.amplifyapp.com') return new Response('Data service unavailable',{status:503});
  try {
    const headers = new Headers();
    for (const name of ['if-none-match','if-modified-since']) if (request.headers.has(name)) headers.set(name,request.headers.get(name));
    const response=await fetcher(new Request(`${origin}/${target}`,{method:request.method,headers,redirect:'manual'}));
    if (![200,304,404].includes(response.status)) throw Error('Unavailable object');
    const out=new Headers();
    for (const name of ['etag','last-modified']) if (response.headers.has(name)) out.set(name,response.headers.get(name));
    out.set('Cache-Control','public, max-age=0, s-maxage=60, must-revalidate');
    out.set('Content-Type',target.endsWith('.json')?'application/json; charset=utf-8':target.endsWith('.js')?'application/javascript; charset=utf-8':target.endsWith('.xml')?'application/xml; charset=utf-8':'text/html; charset=utf-8');
    return new Response(response.body,{status:response.status,headers:out});
  } catch { return new Response('Data service unavailable',{status:503,headers:{'Cache-Control':'no-store'}}); }
}
module.exports={routePath,handleRequest};
