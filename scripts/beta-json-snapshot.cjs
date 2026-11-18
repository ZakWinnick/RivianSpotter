'use strict';
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const M=require('../js/location-model.js');
function buildJsonSnapshot({dataDir,catalog,output,combine=M.combineLocations}){
 if(fs.existsSync(output))throw Error('Snapshot output exists');
 const read=n=>JSON.parse(fs.readFileSync(path.join(dataDir,n),'utf8'));
 const places=read('locations.json'),charging=read('charging.json'),roamer=read('roamer.json'),photos=read('location-photos.json'),updates=read('location-updates.json'),changelog=read('site-changelog.json'),summary=read('refresh-summary.json'),chargingSummary=read('charging-summary.json');
 const api=JSON.parse(catalog.toString('utf8'));
 if(api.schemaVersion!==1||!Number.isSafeInteger(api.revision)||api.revision<=0||!Array.isArray(api.places)||!api.places.length)throw Error('Invalid catalog');
 if(!Array.isArray(places)||!Array.isArray(charging)||!Array.isArray(roamer.stations)||!Array.isArray(updates.days)||!Array.isArray(changelog)||!photos||typeof photos!=='object')throw Error('Invalid source snapshot');
 const combined=combine(places,charging,roamer.stations);
 if(!Array.isArray(combined)||!combined.length)throw Error('Empty location inventory');
 const locations=Object.create(null),regions=new Set(),ids=new Set();
 for(const p of combined){
  const canonical=String(p.slug||'');if(!/^[a-z0-9-]+$/.test(canonical))throw Error('Invalid location slug');
  const id=String(p.id??'');if(!id||ids.has(id))throw Error('Duplicate or missing location ID');ids.add(id);
  for(const alias of [canonical,...(p.legacySlugs||[])]){if(!/^[a-z0-9-]+$/.test(alias)||Object.hasOwn(locations,alias))throw Error('Invalid or duplicate location alias');locations[alias]=canonical;}
  if(p.state){if(!/^[A-Z]{2}$/.test(p.state))throw Error('Invalid region');regions.add(p.state.toLowerCase());}
 }
 const catalogIds=new Set(api.places.map(p=>String(p.id)));
 if(catalogIds.size!==api.places.length||catalogIds.size!==ids.size||[...ids].some(id=>!catalogIds.has(id)))throw Error('Catalog and map identities do not match');
 const payload={schemaVersion:1,revision:api.revision,locations:places,charging,roamer:roamer.stations,photos,updates,changelog,summary,chargingSummary};
 const snapshotId=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 const routes={schemaVersion:1,snapshotId,locations,regions:[...regions].sort()};
 const urls=['/','/locations/','/regions/','/updates.html','/changelog.html','/about.html','/privacy.html','/contact.html',...Object.keys(locations).map(s=>`/locations/${s}/`),...routes.regions.map(s=>`/regions/${s}/`)];
 const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>`<url><loc>https://rivspotter.com${u}</loc></url>`).join('')+'</urlset>';
 fs.mkdirSync(path.join(output,'api/v1'),{recursive:true});fs.mkdirSync(path.join(output,'data'),{recursive:true});
 fs.writeFileSync(path.join(output,'api/v1/catalog.json'),catalog);
 fs.writeFileSync(path.join(output,'data/beta-bundle.json'),JSON.stringify({...payload,snapshotId})+'\n');
 fs.writeFileSync(path.join(output,'data/beta-routes.json'),JSON.stringify(routes)+'\n');
 fs.writeFileSync(path.join(output,'sitemap.xml'),sitemap+'\n');
 return {catalogRevision:api.revision,snapshotId,locations:combined.length,routes:Object.keys(locations).length,bytes:Buffer.byteLength(JSON.stringify(payload))};
}
if(require.main===module){try{console.log(JSON.stringify(buildJsonSnapshot({dataDir:process.argv[2],catalog:fs.readFileSync(process.argv[3]),output:process.argv[4]})));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={buildJsonSnapshot};
