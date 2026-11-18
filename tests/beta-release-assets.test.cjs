'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {rewriteHtml,rewriteCss,rewriteWorker,validatedRelease,resolveDesign}=require('../scripts/beta-release-assets.cjs');
const sha='a'.repeat(40);
test('HTML uses immutable design assets while live data scripts stay on same-host data paths',()=>{
  const html='<link href="/css/style.css?v=old"><script src="/js/app.js?v=old"></script><script src="/js/locations.js?v=old"></script><img src="/assets/logo.png">';
  const out=rewriteHtml(html,sha);
  assert.match(out,new RegExp(`/beta-releases/${sha}/css/style.css`));
  assert.match(out,new RegExp(`/beta-releases/${sha}/js/app.js`));
  assert.match(out,/src="\/js\/locations\.js\?v=old"/);
  assert.match(out,new RegExp(`/beta-releases/${sha}/assets/logo.png`));
});
test('CSS absolute static asset references remain bound to their design',()=>{
  assert.equal(rewriteCss('background:url(/assets/logo.png)',sha),`background:url(/beta-releases/${sha}/assets/logo.png)`);
});
test('worker precaches the matching immutable shell and preserves live data scripts',()=>{
  const src="const RELEASE = 'old';\nconst STATIC_ASSETS = ['/css/style.css', '/js/app.js', '/js/locations.js'];\nif (STATIC_ASSETS.includes(url.pathname)) {}";
  const out=rewriteWorker(src,sha);
  assert.match(out,new RegExp(`/beta-releases/${sha}/js/app.js`));
  assert.match(out,/['"]\/js\/locations\.js['"]/);
  assert.match(out,new RegExp(`const RELEASE = '${sha}'`));
  assert.match(out,/beta-releases.*vendor/);
});
test('accepts only exact commit hashes and a positive supported release format',()=>{
  assert.equal(validatedRelease(sha),sha);
  assert.throws(()=>validatedRelease('HEAD'),/commit/i);
  assert.throws(()=>validatedRelease('../main'),/commit/i);
});
test('new release must be the current beta-main head; refresh retains published design',()=>{
  assert.equal(resolveDesign({requested:sha,head:sha,published:'b'.repeat(40)}),sha);
  assert.equal(resolveDesign({head:sha,published:'b'.repeat(40)}),'b'.repeat(40));
  assert.throws(()=>resolveDesign({requested:'b'.repeat(40),head:sha,published:sha}),/head/i);
});
