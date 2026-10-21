// Shared public location-change comparison and reader-facing descriptions.
const path=require('node:path'),crypto=require('node:crypto');
const REPO=path.resolve(__dirname,'..'),BASE='https://rivianspotter.com';
const M=require('../js/location-model.js');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function stable(v){
 if(v===undefined||v===null||v==='')return null;
 if(typeof v==='string')return v.replace(/\s+/g,' ').trim();
 if(Array.isArray(v))return v.map(stable).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
 return v;
}
function comparable(field,value){
 if(field==='Connector types'&&typeof value==='string'){
  const parts=value.split(',').map(p=>p.trim());
  if(parts.every(p=>/^\d+\s+(CCS|NACS|J1772|CHAdeMO|Type 2)$/i.test(p)))return parts.map(p=>p.toUpperCase().replace(/\s+/g,' ')).sort();
 }
 return stable(value);
}
function normalize(data){
 const observations=new Map(data.roamer.stations.map(r=>[r.sourceId,r]));
 return [...data.locations,...data.charging].map(p=>{
  const r=observations.get(p.sourceId),detailNew=r&&Date.parse(r.detailsObservedAt||0)>=Date.parse(r.observedAt||0);
  const fields={};
  const names={name:'Name',type:'Location type',address:'Address',city:'City',state:'State or province',country:'Country',postalCode:'Postal code',coordinatePrecision:'Pin precision',timezone:'Local time zone',hours:'Visiting hours',serviceHours:'Service hours',chargingHours:'Charging hours',phone:'Phone',services:'Services',capabilities:'Visit options',status:'Location status',serviceStatus:'Service status',publishedHoursExceptions:'Hours exceptions',hoursExceptions:'Dated hours exceptions',rivianUrl:'Official page',bookingUrl:'Booking link',officialDirectionsUrl:'Directions link',chargerCount:'Charger count',maxKw:'Maximum power (kW)',rivianOnly:'Rivian-only access'};
  for(const [k,label] of Object.entries(names))fields[label]=stable(p[k]);
  fields['Map pin']=[p.lat,p.lng].map(n=>Number.isFinite(n)?Number(n.toFixed(6)):null);
  fields['Rating']=p.reliabilityGrade||r?.reliabilityGrade||null;
  if(r){
   for(const [k,label] of Object.entries({connectorSummary:'Connector types',averagePeakKw:'Average peak power (kW)',hours:'Charger access hours',amenities:'Site features',chargers:'Individual chargers',access:'Reported vehicle access'}))fields[label]=stable(r[k]);
   fields['Reported charger condition']=detailNew&&r.detailReportedStatus?r.detailReportedStatus:r.reportedStatus||null;
   const rate=(detail,network)=>detailNew?detail||network:network||detail;
   const energy=(detailNew||!(r.rates?.Rivian||r.rates?.['Other EVs']))&&r.detailRates?.Energy&&!r.detailRates?.Rivian&&!r.detailRates?.Other;
   fields['Pricing']=stable(energy?{Energy:r.detailRates.Energy}:{Rivian:rate(r.detailRates?.Rivian,r.rates?.Rivian),'Other EVs':rate(r.detailRates?.Other,r.rates?.['Other EVs'])});
   fields['Idle fee']=stable(r.detailRates?.Idle);
  }
  return {id:String(p.id),aliases:(p.legacyIds||[]).map(String),name:p.name,type:p.type==='RAN'?'Rivian Adventure Network':p.type,city:p.city,state:p.state,listed:p.listed!==false,url:BASE+M.locationUrl(p),fields};
 });
}
function compare(before,after){
 const old=new Map(before.map(p=>[p.id,p])),consumed=new Set(),events=[];
 for(const p of after){
  const previous=old.get(p.id)||p.aliases?.map(id=>old.get(id)).find(Boolean);
  if(previous)consumed.add(previous.id);
  for(const alias of p.aliases||[])if(old.has(alias))consumed.add(alias);
  let kind,changes=[];
  if(!previous){if(!p.listed)continue;kind='added';}
  else if(previous.listed&&!p.listed)kind='no-longer-listed';
  else if(!previous.listed&&p.listed)kind='relisted';
  else if(!p.listed)continue;
  else {
   changes=[...new Set([...Object.keys(previous.fields),...Object.keys(p.fields)])].filter(k=>JSON.stringify(comparable(k,previous.fields[k]))!==JSON.stringify(comparable(k,p.fields[k]))).map(field=>({field,before:previous.fields[field]??null,after:p.fields[field]??null}));
   if(!changes.length)continue;
   kind=previous.fields['Location status']==='planned'&&p.fields['Location status']==='open'?'now-active':'changed';
  }
  events.push({eventId:hash({id:p.id,kind,changes,fields:kind==='added'?p.fields:undefined}),kind,id:p.id,name:p.name,type:p.type,city:p.city,state:p.state,url:p.url,changes,...(kind==='added'||kind==='relisted'?{details:p.fields}:{})});
 }
 for(const p of before)if(p.listed&&!consumed.has(p.id)&&!after.some(a=>a.id===p.id))events.push({eventId:hash({id:p.id,kind:'no-longer-listed'}),kind:'no-longer-listed',id:p.id,name:p.name,type:p.type,city:p.city,state:p.state,url:p.url,changes:[]});
 return events.sort((a,b)=>a.name.localeCompare(b.name)||a.type.localeCompare(b.type));
}
const md=v=>String(v).replace(/[\\`*_[\]<>]/g,c=>'\\'+c);
function display(v){if(v===null||v===undefined)return 'Not published';if(typeof v==='boolean')return v?'Yes':'No';if(Array.isArray(v))return v.length?v.map(display).join('; '):'None listed';if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${display(x)}`).join('; ');return String(v);}
function dateLabel(value){return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T12:00:00Z'));}
function words(value){
 const labels={planned:'Coming soon',open:'Open',unknown:'Not confirmed','temporarily-closed':'Temporarily closed','demo-drive':'Demo drives',service:'Service',charging:'Charging',exact:'Street-level location','map-pin':'Published map location',city:'Approximate city location',RAN:'Rivian Adventure Network'};
 return md(labels[value]||display(value));
}
function rate(value){
 if(!value)return 'not published';
 const {parseRate}=require(path.join(REPO,'js/components.js')),p=parseRate(value);
 return md(p.summary)+(p.summary&&/^\$/.test(p.summary)?'/kWh':'');
}
function schedule(value){
 const {parseRate}=require(path.join(REPO,'js/components.js')),p=parseRate(value);
 return p.periods.length?p.periods.map(t=>`${t.days} ${t.start}–${t.end}: ${t.rate}/kWh`).join('; '):p.note||'';
}
function changeLines(d){
 const before=d.before,after=d.after,label=md(d.field);
 if(d.field==='Pricing'){
  return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(k=>stable(before?.[k])!==stable(after?.[k])).flatMap(k=>{
   const a=before?.[k],b=after?.[k],who=k==='Energy'?'Charging':k==='Rivian'?'Rivian vehicles':k;
   const summary=rate(a)===rate(b)?`${who}: time-of-use pricing changed; the range remains ${rate(b)}.`:`${who}: ${rate(b)} (previously ${rate(a)}).`;
   const detail=schedule(b);
   return [`- **Charging prices:** ${summary}`,...(detail?[`  - Current schedule (local time): ${md(detail)}`]:[])];
  });
 }
 if(d.field==='Individual chargers'){
  const old=new Map((before||[]).map(p=>[p.name,p])),now=new Map((after||[]).map(p=>[p.name,p]));
  const describe=p=>[p.connector,p.powerKw?`${p.powerKw} kW`:null,...(p.features||[]).map(f=>f.description||f.label)].filter(Boolean).join(', ');
  return [...new Set([...old.keys(),...now.keys()])].flatMap(key=>{
   const a=old.get(key),b=now.get(key);if(JSON.stringify(stable(a))===JSON.stringify(stable(b)))return [];
   return [`- **Charger ${md(key)}:** ${b?md(describe(b)):'No longer listed'}${a?` (previously ${md(describe(a))})`:' — details added'}.`];
  });
 }
 if(d.field==='Reported charger condition')return [`- **Charger update:** ${after&&/^operational$/i.test(after)?'Reported as working again':words(after)}${before?` (previously ${words(before).toLowerCase()})`:''}.`];
 if(d.field==='Map pin')return ['- **Map location:** The pin was updated. See the location page for directions.'];
 if(d.field==='Pin precision')return [`- **Map location:** ${after==='city'?'An approximate city location is shown; the address has not been published.':after?'A more precise location is now available.':'The location’s precision is no longer specified.'}`];
 if(d.field==='Rivian-only access')return [`- **Vehicle access:** ${after===true?'Rivian vehicles only':after===false?'Open to other EVs':'Access details are no longer published'}.`];
 if(['Official page','Booking link','Directions link'].includes(d.field))return [`- **${label}:** ${after&&/^https:\/\//.test(after)?`[Updated link](${after})`:'The previous link is no longer listed'}.`];
 if(['Services','Visit options','Site features'].includes(d.field)){
  const a=before||[],b=after||[],added=b.filter(x=>!a.includes(x)),removed=a.filter(x=>!b.includes(x));
  return [`- **${label}:** ${[added.length?`Added ${added.map(words).join(', ')}`:null,removed.length?`no longer lists ${removed.map(words).join(', ')}`:null].filter(Boolean).join('; ')}.`];
 }
 if(['Hours exceptions','Dated hours exceptions'].includes(d.field))return [`- **Special hours:** ${words(after)}${before?` (previously ${words(before)})`:''}.`];
 if(after===null||after===undefined)return [`- **${label}:** No longer published (previously ${words(before)}).`];
 return [`- **${label}:** ${words(after)}${before!==null&&before!==undefined?` (previously ${words(before)})`:' — details added'}.`];
}
function newLocationLines(e){
 const f=e.details||{},lines=[];
 if(f['Location status']==='planned')lines.push('Coming soon. An opening date has not been announced.');
 if(f.Address)lines.push(md(f.Address));
 const charger=[f['Charger count']?`${f['Charger count']} chargers`:null,f['Maximum power (kW)']?`up to ${f['Maximum power (kW)']} kW`:null,f['Connector types']].filter(Boolean);
 if(charger.length)lines.push(charger.map(md).join(' · '));
 for(const k of ['Visiting hours','Service hours','Charging hours','Charger access hours'])if(f[k])lines.push(`**${md(k)}:** ${words(f[k])}`);
 if(f.Pricing)for(const [k,v] of Object.entries(f.Pricing))if(v)lines.push(`**${k==='Energy'?'Charging price':md(k)}:** ${rate(v)}${schedule(v)?' (varies by time of day)':''}`);
 if(f['Rivian-only access']!==null&&f['Rivian-only access']!==undefined)lines.push(f['Rivian-only access']?'Rivian vehicles only.':'Open to other EVs.');
 if(f['Site features']?.length)lines.push(`**On site:** ${f['Site features'].map(words).join(', ')}`);
 return lines;
}
function body(report){
 const c=report.snapshot,s=c.sourceDates,run=c.latestRefresh;
 const delayed=s.places!==report.date||s.charging!==report.date||run?.status!=='completed'||run?.conclusion!=='success';
 const detailDate=s.chargingDetails&&new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.chargingDetails));
 const partial=c.rateLimited||c.detailErrors?.length||c.coverage?.notCheckedIds?.length||detailDate!==report.date;
 const kinds={added:'Added to the map','now-active':'Now active',relisted:'Back on the map',changed:'Location updates','no-longer-listed':'No longer on the map'};
 const totals=Object.fromEntries(Object.keys(kinds).map(k=>[k,report.events.filter(e=>e.kind===k).length]));
 const tally=[totals.added?`${totals.added} new location${totals.added===1?'':'s'}`:null,totals['now-active']?`${totals['now-active']} now active`:null,totals.relisted?`${totals.relisted} back on the map`:null,totals.changed?`${totals.changed} location${totals.changed===1?'':'s'} updated`:null,totals['no-longer-listed']?`${totals['no-longer-listed']} removed`:null].filter(Boolean).join(' · ');
 const lines=['# Rivian Spotter',`**Your location update · ${dateLabel(report.date)}**`,''];
 if(report.events.length){
  lines.push(tally,'');
  if(delayed)lines.push(`Today’s update is taking longer than usual. Here’s what has changed on the map so far. The latest location information is from ${dateLabel(s.charging<s.places?s.charging:s.places)}.`,'');
 }else if(delayed){
  lines.push('**Today’s update is delayed.**',`We’re still waiting for fresh location information. The map currently shows information from ${dateLabel(s.charging<s.places?s.charging:s.places)}.`,'','There are no new changes to share yet.');
 }else lines.push('**No location changes today.**','The latest check found no new locations or changes to the places already on the map.');
 if(partial&&!delayed)lines.push('','Some charging details could not be updated today, so those locations still show the last available information.');
 for(const kind of Object.keys(kinds)){
  const events=report.events.filter(e=>e.kind===kind);if(!events.length)continue;lines.push('',`## ${kinds[kind]}`,'');
  for(const e of events){
   lines.push(`### ${md(e.name)}`);
   const locality=[e.city,e.state].filter(Boolean).join(', ');
   lines.push(`${md(e.type)}${locality&&!e.name.includes(locality)?' · '+md(locality):''}`,'');
   if(kind==='added'||kind==='relisted')lines.push(...newLocationLines(e),'');
   if(kind==='no-longer-listed')lines.push('This location has been removed from the directory. That does not necessarily mean it has closed.','');
   if(kind==='now-active')lines.push('Previously marked coming soon; station details are now available.','');
   for(const d of e.changes)lines.push(...changeLines(d));
   lines.push('',`[View location](${e.url})`,'');
  }
 }
 lines.push('','[Explore the map](https://rivianspotter.com)','');
 if(report.events.some(e=>e.changes.some(c=>c.field==='Reported charger condition')))lines.push('Charger reports reflect the latest daily check, not live availability.','');
 lines.push('Rivian Spotter · An independent guide to Rivian locations and charging.');
 return lines.join('\n');
}

module.exports={stable,comparable,normalize,compare,body,changeLines,newLocationLines,dateLabel};
