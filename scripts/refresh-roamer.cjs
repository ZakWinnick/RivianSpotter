/* Public HTML only. Daily network snapshot and a small, paced rotating detail batch. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load}=require('cheerio');
const NETWORK='https://rivianroamer.com/charging/networks/rivian-adventure-network';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function parseNetwork(html,{minimum=100}={}){
 const $=load(html),markers=JSON.parse($('[data-cluster-map-markers-value]').attr('data-cluster-map-markers-value')||'[]');
 const byId=new Map(markers.map(m=>[m.url.split('/').pop(),m]));
 const rows=$('article').toArray().map(el=>{const a=$(el).find('a[href^="/charging/sites/"]').first(),sourceId=(a.attr('href')||'').split('/').pop();if(!/^US-RIV-L\d+$/.test(sourceId))return null;
 const card=$(el),paragraphs=card.find('p').toArray().map(x=>clean($(x).text())),badges=card.children('div').first().children('span').toArray().map(x=>clean($(x).text()));
 const rates={};card.find('dt').each((i,x)=>{rates[clean($(x).text())]=clean($(x).next('dd').text());});
 const marker=byId.get(sourceId);if(!marker || !Array.isArray(marker.coordinates) || !Number.isFinite(marker.coordinates[0]) || !Number.isFinite(marker.coordinates[1]) || Math.abs(marker.coordinates[0])>90 || Math.abs(marker.coordinates[1])>180)throw Error('Invalid station marker '+sourceId);
 return {sourceId,name:clean(a.text()),sourceUrl:new URL(a.attr('href'),NETWORK).href,lat:marker.coordinates[0],lng:marker.coordinates[1],reportedStatus:badges[1]||null,access:badges[0]||null,reliabilityGrade:(badges.find(x=>x.startsWith('Reliability '))||'').replace('Reliability ','')||null,chargerCount:Number((paragraphs.find(x=>/^\d+ chargers?$/.test(x))||'').match(/^\d+/)?.[0])||null,connectorSummary:paragraphs.find(x=>/\d+ (?:NACS|CCS|J1772)/.test(x))||null,averagePeakKw:Number((paragraphs.find(x=>/kW avg peak/.test(x))||'').match(/[\d.]+/)?.[0])||null,rates,firstTracked:paragraphs.find(x=>x.startsWith('First tracked '))?.replace('First tracked ','')||null};
 }).filter(Boolean);
 if(rows.length<minimum||new Set(rows.map(x=>x.sourceId)).size!==rows.length)throw Error('Incomplete or duplicate Roamer inventory');
 for(const s of rows)if(!s.name || !s.reportedStatus || !s.connectorSummary || !Number.isInteger(s.chargerCount) || s.chargerCount<1 || s.chargerCount>1000)throw Error("Incomplete station card "+s.sourceId);
 return rows;
}
function parseDetail(html){
 const $=load(html),main=$('main');if(!main.find('h1').length)throw Error('Missing station detail');
 const metrics={};main.find('div.text-center').children('div').each((i,el)=>{const kids=$(el).children('div');if(kids.length>=2)metrics[clean(kids.eq(1).text())]=clean(kids.eq(0).text());});
 const amenities=main.find('div.mt-3').first().children('span').toArray().map(el=>clean($(el).text()));
 const rates={};main.find('span').filter((i,el)=>['Rivian','Other','Idle'].includes(clean($(el).text()))).each((i,el)=>{const value=clean($(el).next('span').text());if(value)rates[clean($(el).text())]=value;});
 const chargers=main.find('tbody tr').toArray().map(el=>{const cells=$(el).find('td');return {name:clean(cells.eq(0).text()),powerKw:Number(clean(cells.eq(1).text()).match(/[\d.]+/)?.[0])||null,connector:clean(cells.eq(2).text()),features:cells.eq(3).find('[data-tooltip-content-value]').toArray().map(x=>({label:clean($(x).text()),description:$(x).attr('data-tooltip-content-value')}))};});
 const sourceUpdatedText=main.find('span').toArray().map(el=>clean($(el).text())).find(x=>/^Updated /.test(x))||null;
 const address=clean(main.find('h1').parent().parent().find('[data-metadata-list-separator]').first().prev('span').text());
 if(!chargers.length||Number(metrics.Stations)!==chargers.length || chargers.some(c=>!c.name || !c.connector || !(c.powerKw>0 && c.powerKw<=2000)) || new Set(chargers.map(c=>c.name)).size!==chargers.length)throw Error('Incomplete station detail');
 return {address,amenities,maxKw:Number(metrics['Max kW'])||null,averageKw:Number(metrics['Avg kW'])||null,hours:metrics.Hours||null,detailRates:rates,chargers,sourceUpdatedText};
}
async function refresh({output='data/roamer.json',cacheDir,cacheOnly=false,maxDetails=6}={}){
 cacheDir ||= fs.mkdtempSync(path.join(require('node:os').tmpdir(),'spotter-roamer-'));
 fs.mkdirSync(cacheDir,{recursive:true});let requests=0,rateLimited=false;
 const old=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null;
 const previous=new Map((old?.stations||[]).map(s=>[s.sourceId,s]));
 async function get(url,key){
  const file=path.join(cacheDir,key+'.html');
  if(fs.existsSync(file))return {html:fs.readFileSync(file,'utf8'),observedAt:fs.statSync(file).mtime.toISOString()};
  if(cacheOnly) return null;
  if(requests)await new Promise(r=>setTimeout(r,15000));
  const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'RivianSpotter/1.0 (+https://rivianspotter.com/about.html)'}});requests++;
  if(!response.ok){const error=Error(`Roamer returned ${response.status}; stopped without retrying`);error.rateLimited=response.status===429;error.retryAfter=response.headers.get('retry-after');throw error;}
  const html=await response.text();if(html.length>5e6)throw Error('Oversized response');fs.writeFileSync(file,html);return {html,observedAt:new Date().toISOString()};
 }
 if(!cacheOnly && old?.nextRequestAfter && Date.parse(old.nextRequestAfter)>Date.now()){console.log('Roamer cooldown active; retaining the last snapshot.');return old;}
 let network;try{network=await get(NETWORK,'network');}catch(error){if(error.rateLimited && old){const delay=Number(error.retryAfter),at=Date.parse(error.retryAfter||'');old.nextRequestAfter=new Date(Number.isFinite(delay)&&delay>0?Date.now()+Math.max(86400,delay)*1000:Number.isFinite(at)?Math.max(Date.now()+86400000,at):Date.now()+86400000).toISOString();old.rateLimited=true;fs.writeFileSync(output,JSON.stringify(old,null,2)+'\n');}throw error;}if(!network)throw Error('Network snapshot missing');
 const stations=parseNetwork(network.html),observedAt=network.observedAt;
 if(previous.size && stations.length<previous.size*0.85)throw Error("Unexpected Roamer inventory loss; retaining previous snapshot");
 const detailKeys=['address','amenities','maxKw','averageKw','hours','detailRates','chargers','sourceUpdatedText','detailsObservedAt'];
 for(const s of stations){const prev=previous.get(s.sourceId);if(prev)for(const key of detailKeys)if(key in prev)s[key]=prev[key];s.observedAt=observedAt;}
 // Oldest details first. A daily pass refreshes only six pages, not the entire site.
 const queue=stations.slice().sort((a,b)=>(a.detailsObservedAt||'').localeCompare(b.detailsObservedAt||''));
 let fetchedDetails=0,nextRequestAfter=null;
 for(const s of queue){
  const cached=fs.existsSync(path.join(cacheDir,s.sourceId+'.html'));if(!cached && (cacheOnly||fetchedDetails>=maxDetails))continue;
  try{const result=await get(s.sourceUrl,s.sourceId);if(!result)continue;Object.assign(s,parseDetail(result.html),{detailsObservedAt:result.observedAt});if(!cached)fetchedDetails++;}
  catch(error){console.warn(error.message);if(error.rateLimited){rateLimited=true;const seconds=Number(error.retryAfter);const parsed=Date.parse(error.retryAfter||'');nextRequestAfter=new Date(Number.isFinite(seconds)&&seconds>0?Date.now()+Math.max(86400,seconds)*1000:Number.isFinite(parsed)?Math.max(Date.now()+86400000,parsed):Date.now()+86400000).toISOString();}break;}
 }
 const fields=['reportedStatus','reliabilityGrade','access','connectorSummary','chargerCount','rates','maxKw','averagePeakKw','hours','amenities','detailRates','chargers'];
 const currentChanges=old?stations.flatMap(s=>{const prev=previous.get(s.sourceId);return !prev?[{sourceId:s.sourceId,name:s.name,kind:'newly-detected',observedAt}]:fields.filter(k=>k in prev && JSON.stringify(s[k])!==JSON.stringify(prev[k])).map(field=>({sourceId:s.sourceId,name:s.name,kind:'changed',field,before:prev[field],after:s[field],observedAt}));}):[];
 const changes=[...(old?.changes||[]).filter(c=>Date.parse(c.observedAt)>Date.now()-30*86400000),...currentChanges].slice(-200);
 const result={sourceUrl:NETWORK,observedAt,completedAt:new Date().toISOString(),sourceHash:crypto.createHash('sha256').update(network.html).digest('hex'),stationCount:stations.length,detailCount:stations.filter(s=>s.chargers).length,scheduleEnabled:true,cadence:'Daily network check; up to six detail pages per day, spaced 15 seconds apart',rateLimited,nextRequestAfter,changes,stations};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(output+'.tmp',output);console.log(`Saved ${stations.length} stations, ${result.detailCount} detail snapshots; ${requests} requests.`);return result;
}
module.exports={parseNetwork,parseDetail,refresh};
if(require.main===module)refresh({cacheDir:process.env.ROAMER_CACHE_DIR,cacheOnly:process.argv.includes('--cache-only')}).catch(e=>{console.error(e.message);process.exitCode=1;});
