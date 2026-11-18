'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buildSnapshot(dist, output, {shellRelease} = {}) {
  dist = path.resolve(dist); output = path.resolve(output);
  if (!/^[A-Za-z0-9._-]+$/.test(shellRelease || '')) throw Error('A verified deployed beta shell release is required');
  if (fs.existsSync(output)) throw Error('Snapshot output already exists');
  const catalog = JSON.parse(fs.readFileSync(path.join(dist,'api/v1/catalog.json'),'utf8'));
  if (catalog.schemaVersion !== 1 || !Number.isSafeInteger(catalog.revision) || catalog.revision < 1 || !Array.isArray(catalog.places) || !catalog.places.length || new Set(catalog.places.map(p=>p.id)).size !== catalog.places.length || catalog.places.some(p=>!p.id)) throw Error('Invalid v1 catalog');
  const files = [], contents = new Map();
  function add(relative) {
    const source = path.join(dist, relative), stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw Error(`Symlink in snapshot: ${relative}`);
    if (stat.isDirectory()) { for (const name of fs.readdirSync(source).sort()) add(path.posix.join(relative,name)); return; }
    if (!stat.isFile()) throw Error(`Non-file in snapshot: ${relative}`);
    let bytes = fs.readFileSync(source);
    if (relative.endsWith('.html')) bytes = Buffer.from(bytes.toString('utf8').replace(/((?:src|href)="\/(?:js|css|vendor)\/[^"?]+\.(?:js|css))\?v=[^"]+"/g, `$1?v=${shellRelease}"`));
    if (relative === 'service-worker.js') {
      let text = bytes.toString('utf8');
      if (!/const RELEASE = '[^']+';/.test(text) || !/const PUBLIC_DATA = new Set\(\[/.test(text)) throw Error('Unsupported service-worker format');
      text = text.replace(/const RELEASE = '[^']+';/, `const RELEASE = '${shellRelease}';`)
        .replace('const PUBLIC_DATA = new Set([', "const PUBLIC_DATA = new Set(['/data/beta-bundle.json', '/js/app.js', '/js/charging.js', '/js/roamer.js', ");
      bytes = Buffer.from(text);
    }
    if (relative === 'js/app.js') {
      let text=bytes.toString('utf8');
      const load=text.indexOf('  async function load() {'), start=text.indexOf('    try {',load), endMarker='    all = M.combineLocations(all, chargers, roamer);', end=text.indexOf(endMarker,start);
      if (load<0 || start<0 || end<0) throw Error('Unsupported beta data loader');
      const replacement=`    let chargers, roamer;\n    try {\n      const response = await fetch('/data/beta-bundle.json', {cache:'no-cache'});\n      if (!response.ok) throw Error('Directory unavailable');\n      const data = await response.json();\n      if (!Array.isArray(data.locations) || !data.locations.length || !Array.isArray(data.charging) || !data.charging.length || !Array.isArray(data.roamer)) throw Error('Invalid directory');\n      all = data.locations; chargers = data.charging; roamer = data.roamer;\n    } catch {\n      all = typeof rivianLocations !== 'undefined' ? rivianLocations : window.rivianLocations || [];\n      chargers = typeof rivianChargingLocations !== 'undefined' ? rivianChargingLocations : [];\n      roamer = typeof rivianRoamerSnapshot !== 'undefined' ? rivianRoamerSnapshot.stations : [];\n      if (!all.length) { if ($('results')) $('results').innerHTML = '<div class="empty"><h2>Locations couldn’t load.</h2><p>Check your connection and try again.</p><button class="button" data-reload>Try again</button></div>'; return; }\n      toast('Showing the bundled location directory. Live refresh is unavailable.');\n    }\n`;
      text=text.slice(0,start)+replacement+text.slice(end);
      bytes=Buffer.from(text);
    }
    contents.set(relative,bytes);
    files.push({path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length});
  }
  for (const name of ['api/v1/catalog.json','data','locations','regions','updates.html','stats.html','sitemap.xml','service-worker.js','js/app.js','js/locations.js','js/charging.js','js/roamer.js']) add(name);
  const bundle={revision:catalog.revision,locations:JSON.parse(fs.readFileSync(path.join(dist,'data/locations.json'))),charging:JSON.parse(fs.readFileSync(path.join(dist,'data/charging.json'))),roamer:JSON.parse(fs.readFileSync(path.join(dist,'data/roamer.json'))).stations};
  if(!Array.isArray(bundle.locations)||!Array.isArray(bundle.charging)||!Array.isArray(bundle.roamer)) throw Error('Invalid beta data bundle');
  const bundleBytes=Buffer.from(JSON.stringify(bundle)+'\n'), bundlePath='data/beta-bundle.json';
  if(contents.has(bundlePath)) throw Error('Conflicting beta data bundle');
  contents.set(bundlePath,bundleBytes);
  files.push({path:bundlePath,sha256:crypto.createHash('sha256').update(bundleBytes).digest('hex'),size:bundleBytes.length});
  for (const name of ['data/locations.json','data/charging.json','data/roamer.json','locations/index.html','regions/index.html']) if (!files.some(f=>f.path===name)) throw Error(`Missing ${name}`);
  files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const manifest = {version:1,catalogRevision:catalog.revision,files};
  const snapshot = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  for (const file of files) { const target=path.join(output,'files',file.path); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,contents.get(file.path)); }
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({...manifest,snapshot})+'\n');
  return {snapshot,catalogRevision:catalog.revision,files:files.length,bytes:files.reduce((sum,f)=>sum+f.size,0)};
}
if (require.main === module) {
  try { console.log(JSON.stringify(buildSnapshot(process.argv[2],process.argv[3],{shellRelease:process.env.BETA_SHELL_RELEASE}))); }
  catch(e) { console.error(e.message); process.exitCode=1; }
}
module.exports={buildSnapshot};
