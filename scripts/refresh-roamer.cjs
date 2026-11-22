/* Public HTML only. Daily, paced detail coverage with resumable checkpoints. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load}=require('cheerio');
const NETWORK='https://rivianroamer.com/charging/networks/rivian-adventure-network';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function parseNetwork(html,{minimum=100}={}){
 const $=load(html),markers=JSON.parse($('[data-cluster-map-markers-value]').attr('data-cluster-map-markers-value')||'[]');
 const gradeTones={};$('span').each((i,el)=>{const grade=clean($(el).text()).match(/^([A-F][+-]?):[\d.]+%$/)?.[1],tone=($(el).attr('class')||'').match(/(?:^|\s)text-(emerald|lime|yellow|amber|orange|red|rose)-500(?:\s|$)/)?.[1];if(grade&&tone)gradeTones[grade]=tone;});
 const byId=new Map(markers.map(m=>[m.url.split('/').pop(),m]));
 const rows=$('article').toArray().map(el=>{const a=$(el).find('a[href^="/charging/sites/"]').first(),sourceId=(a.attr('href')||'').split('/').pop();if(!/^US-RIV-L\d+$/.test(sourceId))return null;
 const card=$(el),paragraphs=card.find('p').toArray().map(x=>clean($(x).text())),badges=card.children('div').first().children('span').toArray().map(x=>clean($(x).text()));
 const rates={};card.find('dt').each((i,x)=>{rates[clean($(x).text())]=clean($(x).next('dd').text());});
 const marker=byId.get(sourceId);if(!marker || !Array.isArray(marker.coordinates) || !Number.isFinite(marker.coordinates[0]) || !Number.isFinite(marker.coordinates[1]) || Math.abs(marker.coordinates[0])>90 || Math.abs(marker.coordinates[1])>180)throw Error('Invalid station marker '+sourceId);
 return {sourceId,name:clean(a.text()),sourceUrl:new URL(a.attr('href'),NETWORK).href,lat:marker.coordinates[0],lng:marker.coordinates[1],reportedStatus:badges[1]||null,access:badges[0]||null,reliabilityGrade:(badges.find(x=>x.startsWith('Reliability '))||'').replace('Reliability ','')||null,chargerCount:Number((paragraphs.find(x=>/^\d+ chargers?$/.test(x))||'').match(/^\d+/)?.[0])||null,connectorSummary:paragraphs.find(x=>/\d+ (?:NACS|CCS|J1772)/.test(x))||null,averagePeakKw:Number((paragraphs.find(x=>/kW avg peak/.test(x))||'').match(/[\d.]+/)?.[0])||null,rates,firstTracked:paragraphs.find(x=>x.startsWith('First tracked '))?.replace('First tracked ','')||null};
 }).filter(Boolean);
 if(rows.length<minimum||new Set(rows.map(x=>x.sourceId)).size!==rows.length)throw Error('Incomplete or duplicate Roamer inventory');
 for(const s of rows)s.reliabilityTone=gradeTones[s.reliabilityGrade] || null;
 for(const s of rows)if(!s.name || !s.reportedStatus || !s.connectorSummary || !Number.isInteger(s.chargerCount) || s.chargerCount<1 || s.chargerCount>1000)throw Error("Incomplete station card "+s.sourceId);
 return rows;
}
function parseDetail(html,{sourceId}={}){
 const $=load(html),main=$('main');if(!main.find('h1').length)throw Error('Missing station detail');
 const pageId=$('body').attr('data-navigation-page')?.match(/^charging_sites:show:(US-RIV-L\d+)$/)?.[1];
 if(sourceId && pageId!==sourceId)throw Error('Station detail identity mismatch');
 // Parse only explicit connector counts and power, verifying every tile against the summary.
 if(!main.find('tbody tr').length){
  const heading=main.find('h2').filter((i,e)=>clean($(e).text())==='Chargers').first();
  const card=heading.parent(),summary=clean(card.children('p').first().text());
  const match=summary.match(/^(.+),\s*each rated to\s+(\d+(?:\.\d+)?)\s*kW$/i);
  if(!match)throw Error('Incomplete station detail');
  const parts=match[1].split(/\s*(?:,|\band\b)\s*/i),counts={};
  for(const part of parts){const item=part.match(/^(\d+)\s+(NACS|CCS|J1772|CHAdeMO)$/i);if(!item||!Number(item[1]))throw Error('Incomplete station detail');const key=item[2].toUpperCase();if(counts[key])throw Error('Incomplete station detail');counts[key]=Number(item[1]);}
  const types=Object.keys(counts),count=Object.values(counts).reduce((a,b)=>a+b,0),powerKw=Number(match[2]);
  const tiles=card.find('[title]').toArray().map(el=>clean($(el).attr('title')).split(',').map(clean));
  const chargers=tiles.map(([name,...labels])=>{const detail=labels.join(', '),explicit=detail.match(/(?:^|[,\s])(NACS|CCS|J1772|CHAdeMO)(?=\s|[·,]|$)/i)?.[1]?.toUpperCase();return {name,connector:explicit||(types.length===1?types[0]:null),powerKw,features:/trailer friendly/i.test(detail)?[{label:'trailer friendly',description:'trailer friendly'}]:[]};});
  const observed={};for(const c of chargers)observed[c.connector]=(observed[c.connector]||0)+1;
  if(!count||powerKw<=0||powerKw>2000||chargers.length!==count||chargers.some(c=>!c.name||!counts[c.connector])||new Set(chargers.map(c=>c.name)).size!==count||types.some(t=>observed[t]!==counts[t]))throw Error('Incomplete station detail');
  const result={chargerCount:count,connectorSummary:types.map(t=>`${counts[t]} ${t}`).join(', '),maxKw:powerKw,chargers,partialChargerFeatures:true};
  const details=main.find('h2').filter((i,e)=>clean($(e).text())==='Details').first().parent();
  const amenity=details.find('dt').filter((i,e)=>clean($(e).text())==='Amenities').first().next('dd');
  if(amenity.length){const text=clean(amenity.text());if(text){const amenities=text.replace(/,?\s+and\s+/i,', ').split(/,\s*/).filter(Boolean).map(x=>x[0].toUpperCase()+x.slice(1));const page=clean(main.text());result.amenities=[...(/Open to all EVs/i.test(page)?['Open to All']:[]),...(/Plug\s*&\s*Charge/i.test(page)?['Plug & Charge']:[]),...amenities,...(chargers.some(c=>c.features.some(f=>/trailer friendly/i.test(f.label||'')))?['Trailer OK']:[])];}}
  const rates={};main.find('p').each((i,e)=>{const label=clean($(e).text());const key=/^per kWh for a Rivian$/i.test(label)?'Rivian':/^per kWh for other EVs$/i.test(label)?'Other':null;if(!key)return;const value=clean($(e).parent().clone().find('p').remove().end().text());if(/^\$\d/.test(value))rates[key]=value;});
  const idle=main.find('p').toArray().map(e=>clean($(e).text())).find(x=>/^Idle fee /i.test(x))?.match(/^Idle fee\s+(\$\d+(?:\.\d+)?)\s+a minute after\s+(\d+)\s+minutes?/i);
  if(idle)rates.Idle=`${idle[1]}/min (after ${idle[2]}m)`;
  if(Object.keys(rates).length)result.detailRates=rates;
  return result;
 }
 const metrics={};main.find('div.text-center').children('div').each((i,el)=>{const kids=$(el).children('div');if(kids.length>=2)metrics[clean(kids.eq(1).text())]=clean(kids.eq(0).text());});
 const amenities=main.find('div.mt-3').first().children('span').toArray().map(el=>clean($(el).text()));
 const rates={};main.find('span').filter((i,el)=>['Rivian','Other','Energy','Idle'].includes(clean($(el).text()))).each((i,el)=>{const value=clean($(el).next('span').text());if(value)rates[clean($(el).text())]=value;});
 const chargers=main.find('tbody tr').toArray().map(el=>{const cells=$(el).find('td');return {name:clean(cells.eq(0).text()),powerKw:Number(clean(cells.eq(1).text()).match(/[\d.]+/)?.[0])||null,connector:clean(cells.eq(2).text()),features:cells.eq(3).find('[data-tooltip-content-value]').toArray().map(x=>({label:clean($(x).text()),description:$(x).attr('data-tooltip-content-value')}))};});
 const sourceUpdatedText=main.find('span').toArray().map(el=>clean($(el).text())).find(x=>/^Updated /.test(x))||null;
 const address=clean(main.find('h1').parent().parent().find('[data-metadata-list-separator]').first().prev('span').text());
 if(!chargers.length||Number(metrics.Stations)!==chargers.length || chargers.some(c=>!c.name || !c.connector || !(c.powerKw>0 && c.powerKw<=2000)) || new Set(chargers.map(c=>c.name)).size!==chargers.length)throw Error('Incomplete station detail');
 const connectors={};for(const c of chargers)connectors[c.connector]=(connectors[c.connector]||0)+1;
 const detailReportedStatus=main.find('p').toArray().some(el=>clean($(el).text())==='All chargers offline')?'Offline':null;
 return {detailReportedStatus,chargerCount:chargers.length,connectorSummary:Object.entries(connectors).map(([type,count])=>`${count} ${type}`).join(', '),address,amenities,maxKw:Number(metrics['Max kW'])||null,averageKw:Number(metrics['Avg kW'])||null,hours:metrics.Hours||null,detailRates:rates,chargers,sourceUpdatedText};
}
function mergePartialDetail(previous,update){
 if(!update.partialChargerFeatures)return update;
 const next={...update};delete next.partialChargerFeatures;
 const old=new Map((previous.chargers||[]).map(c=>[c.name,c]));
 next.chargers=next.chargers.map(c=>{
  const features=[...(old.get(c.name)?.features||[]),...c.features],seen=new Set();
  return {...c,features:features.filter(f=>{const k=JSON.stringify(f);if(seen.has(k))return false;seen.add(k);return true;})};
 });
 if(next.detailRates)next.detailRates={...previous.detailRates,...next.detailRates};
 return next;
}
async function refresh({output='data/roamer.json',cacheDir,cacheOnly=false,maxDetails=Infinity,maxRunMs=60*60*1000,officialStations=[],fetchImpl=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 cacheDir ||= fs.mkdtempSync(path.join(require('node:os').tmpdir(),'spotter-roamer-'));
 fs.mkdirSync(cacheDir,{recursive:true});let requests=0,rateLimited=false;
 const started=Date.now(),old=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):null;
 const previous=new Map((old?.stations||[]).map(s=>[s.sourceId,s]));
 const persist=value=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(output+'.tmp',output);return value;};
 const retryAt=error=>{const seconds=Number(error.retryAfter),at=Date.parse(error.retryAfter||'');return new Date(Math.max(Date.now()+86400000,Number.isFinite(seconds)&&seconds>0?Date.now()+seconds*1000:Number.isFinite(at)?at:0)).toISOString();};
 async function get(url,key){
  const file=path.join(cacheDir,key+'.html');
  if(fs.existsSync(file))return {html:fs.readFileSync(file,'utf8'),observedAt:fs.statSync(file).mtime.toISOString()};
  if(cacheOnly)return null;
  if(requests)await pause(15000);
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'RivSpotter/1.0 (+https://rivspotter.com/about.html)'}});requests++;
  if(!response.ok){const error=Error(`Source returned ${response.status}; no immediate retry`);error.status=response.status;error.rateLimited=response.status===429;error.retryAfter=response.headers.get('retry-after');throw error;}
  const html=await response.text();if(html.length>5e6)throw Error('Oversized response');fs.writeFileSync(file,html);return {html,observedAt:new Date().toISOString()};
 }
 if(!cacheOnly && old?.nextRequestAfter && Date.parse(old.nextRequestAfter)>Date.now()){console.log(`Cooldown active until ${old.nextRequestAfter}; retaining the last snapshot.`);return old;}
 let network;try{network=await get(NETWORK,'network');}catch(error){if(error.rateLimited && old)persist({...old,nextRequestAfter:retryAt(error),rateLimited:true});throw error;}if(!network)throw Error('Network snapshot missing');
 const stations=parseNetwork(network.html),observedAt=network.observedAt;
 if(previous.size && stations.length<(old?.networkCount??previous.size)*0.85)throw Error('Unexpected inventory loss; retaining previous snapshot');
 const networkCount=stations.length;
 const listedIds=new Set(stations.map(s=>s.sourceId));
 for(const p of officialStations.filter(p=>p.type==='RAN'&&p.listed!==false&&p.status!=='planned')){
  if(!/^US-RIV-L\d+$/.test(p.sourceId))throw Error('Invalid official station ID');
  if(!listedIds.has(p.sourceId))stations.push({...previous.get(p.sourceId),sourceId:p.sourceId,name:p.name,lat:p.lat,lng:p.lng,sourceUrl:`https://rivianroamer.com/charging/sites/${p.sourceId}`,networkListed:false});
 }
 const detailKeys=['detailReportedStatus','address','amenities','maxKw','averageKw','hours','detailRates','chargers','sourceUpdatedText','detailsObservedAt'];
 for(const s of stations){const prev=previous.get(s.sourceId);if(prev)for(const key of detailKeys)if(key in prev)s[key]=prev[key];if(listedIds.has(s.sourceId)){s.observedAt=observedAt;s.networkListed=true;}}
 // Missing details first, then oldest. Each site is requested at most once per run.
 const complete=s=>Array.isArray(s.chargers)&&s.chargers.length>0;
 const queue=stations.slice().sort((a,b)=>Number(complete(a))-Number(complete(b)) || (a.detailsObservedAt||'').localeCompare(b.detailsObservedAt||''));
 let fetchedDetails=0,nextRequestAfter=null,parseFailures=0;const detailErrors=[],checkedIds=[];
 const fields=['reportedStatus','detailReportedStatus','reliabilityGrade','access','connectorSummary','chargerCount','rates','maxKw','averagePeakKw','hours','amenities','detailRates','chargers'];
 function checkpoint(){
  const currentChanges=old?stations.flatMap(s=>{const prev=previous.get(s.sourceId);return !prev?[{sourceId:s.sourceId,name:s.name,kind:'newly-detected',observedAt}]:fields.filter(k=>k in prev && JSON.stringify(s[k])!==JSON.stringify(prev[k])).map(field=>({sourceId:s.sourceId,name:s.name,kind:'changed',field,before:prev[field],after:s[field],observedAt}));}):[];
  const changes=[...(old?.changes||[]).filter(c=>Date.parse(c.observedAt)>Date.now()-30*86400000),...currentChanges].slice(-200);
  return persist({refreshMode:cacheOnly?'cached-recovery':'daily',startedAt:new Date(started).toISOString(),sourceUrl:NETWORK,observedAt,completedAt:new Date().toISOString(),sourceHash:crypto.createHash('sha256').update(network.html).digest('hex'),networkCount,coverage:coverage(stations,officialStations,{checkedIds}),stationCount:stations.length,detailCount:stations.filter(complete).length,missingDetailIds:stations.filter(s=>!complete(s)).map(s=>s.sourceId),scheduleEnabled:true,cadence:'Daily network and station details, spaced 15 seconds apart; unfinished coverage resumes on the next run',rateLimited,nextRequestAfter,detailErrors,changes,stations});
 }
 checkpoint();
 for(const s of queue){
  if(Date.now()-started>=maxRunMs)break;
  const cached=fs.existsSync(path.join(cacheDir,s.sourceId+'.html'));if(!cached && (cacheOnly||fetchedDetails>=maxDetails))continue;
  try{if(!cached)fetchedDetails++;const result=await get(s.sourceUrl,s.sourceId);if(!result)continue;Object.assign(s,mergePartialDetail(s,parseDetail(result.html,{sourceId:s.sourceId})),{detailsObservedAt:result.observedAt});parseFailures=0;if(!s.networkListed)s.observedAt=result.observedAt;checkedIds.push(s.sourceId);checkpoint();}
  catch(error){detailErrors.push({sourceId:s.sourceId,message:error.message});console.warn(error.message);if(error.rateLimited){rateLimited=true;nextRequestAfter=retryAt(error);}parseFailures=/^(Incomplete station detail|Missing station detail|Station detail identity mismatch)$/.test(error.message)?parseFailures+1:0;checkpoint();if(parseFailures>=3||error.rateLimited||!error.status&&/fetch|timeout|abort/i.test(error.message)||error.status>=500)break;}
 }
 const result=checkpoint();console.log(`Saved ${stations.length} stations, ${result.detailCount} detail snapshots; ${requests} requests.`);return result;
}
// Capture freshness measures our retrieval, not when the upstream operator last changed a fact.
function coverage(stations,officialStations,{checkedIds=[],now=Date.now(),maxAgeMs=36*60*60*1000}={}){
 const targets=officialStations.filter(s=>s.type==='RAN'&&s.listed!==false&&s.status!=='planned'),byId=new Map(stations.map(s=>[s.sourceId,s])),checked=new Set(checkedIds);
 const missingDetailIds=[],staleDetailIds=[],notCheckedIds=[],missingFields=[];
 for(const p of targets){
  const s=byId.get(p.sourceId);
  if(!checked.has(p.sourceId))notCheckedIds.push(p.sourceId);
  if(!s?.chargers?.length)missingDetailIds.push(p.sourceId);
  else if(!Number.isFinite(Date.parse(s.detailsObservedAt))||now-Date.parse(s.detailsObservedAt)>maxAgeMs)staleDetailIds.push(p.sourceId);
  const fields=[];
  if(!s?.hours)fields.push('hours');
  if(!s?.detailRates?.Energy && !(s?.detailRates?.Rivian||s?.rates?.Rivian))fields.push('pricing');
  if(fields.length)missingFields.push({sourceId:p.sourceId,fields});
 }
 return {officialStationCount:targets.length,detailCount:targets.length-missingDetailIds.length,freshDetailCount:targets.length-missingDetailIds.length-staleDetailIds.length,checkedCount:targets.length-notCheckedIds.length,missingDetailIds,staleDetailIds,notCheckedIds,missingFields};
}
module.exports={parseNetwork,parseDetail,mergePartialDetail,refresh,coverage};
if(require.main===module)refresh({officialStations:JSON.parse(fs.readFileSync('data/charging.json','utf8')),cacheDir:process.env.ROAMER_CACHE_DIR,cacheOnly:process.argv.includes('--cache-only')}).catch(e=>{console.error(e.message);process.exitCode=1;});
