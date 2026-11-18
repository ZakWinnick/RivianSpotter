'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {handleRequest}=require('./beta-data-router.cjs');
const origin='https://beta-data.d3qy7654vf25z2.amplifyapp.com';
async function verify(dir) {
  const start=performance.now(), manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const fetcher=async req=>{
    const f=path.join(dir,'files',new URL(req.url).pathname);
    if(!fs.existsSync(f)||!fs.statSync(f).isFile()) return new Response('missing',{status:404});
    return new Response(fs.readFileSync(f));
  };
  const route=['/api/v1/catalog.json','/data/locations.json','/data/charging.json','/data/roamer.json','/data/beta-bundle.json','/js/app.js','/js/locations.js','/js/charging.js','/js/roamer.js','/service-worker.js','/locations/','/regions/','/updates.html','/stats.html','/sitemap.xml'];
  const location=manifest.files.find(x=>/^locations\/[a-z0-9-]+\/index\.html$/.test(x.path));
  if(!location)throw Error('Missing detail page');
  route.push('/'+location.path.replace(/index\.html$/,''));
  for(const p of route) {
    const response=await handleRequest(new Request('https://beta.rivspotter.com'+p),{origin,fetcher});
    if(response?.status!==200)throw Error(`${p} failed`);
    const bytes=Buffer.from(await response.arrayBuffer());
    const key=p.endsWith('/')?p.slice(1)+'index.html':p.slice(1);
    const entry=manifest.files.find(x=>x.path===key);
    if(!entry||crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error(`${p} hash mismatch`);
  }
  const missing=await handleRequest(new Request('https://beta.rivspotter.com/locations/nonexistent-replay-site/'),{origin,fetcher});
  if(missing.status!==404)throw Error('Missing site did not return 404');
  return {manifest,checks:route.length+1,verificationMs:Math.round(performance.now()-start)};
}
(async()=>{
  const [a,b]=await Promise.all(process.argv.slice(2,4).map(verify));
  if(!a || !b || a.manifest.catalogRevision>=b.manifest.catalogRevision)throw Error('Replay revisions must be in increasing order');
  const old=new Map(a.manifest.files.map(x=>[x.path,x])), changed=b.manifest.files.filter(x=>old.get(x.path)?.sha256!==x.sha256);
  const shellA=fs.readFileSync(path.join(process.argv[2],'files','service-worker.js'));
  const shellB=fs.readFileSync(path.join(process.argv[3],'files','service-worker.js'));
  if(!shellA.equals(shellB))throw Error('Worker shell changed with data');
  if(!fs.readFileSync(path.join(process.argv[2],'files','js/app.js')).equals(fs.readFileSync(path.join(process.argv[3],'files','js/app.js'))))throw Error('Application shell changed with data');
  console.log(JSON.stringify({earlierRevision:a.manifest.catalogRevision,currentRevision:b.manifest.catalogRevision,checks:a.checks+b.checks,verificationMs:a.verificationMs+b.verificationMs,changedFiles:changed.length,changedBytes:changed.reduce((n,x)=>n+x.size,0),earlierBytes:a.manifest.files.reduce((n,x)=>n+x.size,0),currentBytes:b.manifest.files.reduce((n,x)=>n+x.size,0)}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
