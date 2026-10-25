#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const DIRECTORY = 'https://rivian.com/spaces/locations';
const SERVICE_SOURCE = 'https://rivian.com/spaces/calgary-service-demo-center';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const decode = s => String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([a-f\d]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const text = s => decode(String(s).replace(/<!--.*?-->|<[^>]*>/gs, '')).replace(/\u2028|\u2029/g, '\n').trim();
const clean = s => text(s).replace(/[ \t]+/g, ' ');
const slugify = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\d]+/g, '-').replace(/^-|-$/g, '');
function addressKey(s) {
 let value = clean(s).toLowerCase().replace(/(\d+)(?:st|nd|rd|th)\b/g, '$1').replace(/\brivian\b/g, '');
 value = value.replace(/\b(suite|ste|building|bldg|unit|space)\s*[a-z\d-]+,?\s*/g, '').replace(/\s+(?:s\s*)?#\s*[a-z\d-]+/g, '');
 value = value.replace(/\b(northwest|northeast|southwest|southeast|north|south|east|west|avenue|street|boulevard|road|drive|highway|parkway|lane|court|circle)\b/g, w => ({northwest:'nw',northeast:'ne',southwest:'sw',southeast:'se',north:'n',south:'s',east:'e',west:'w',avenue:'ave',street:'st',boulevard:'blvd',road:'rd',drive:'dr',highway:'hwy',parkway:'pkwy',lane:'ln',court:'ct',circle:'cir'})[w]);
 value = value.replace(/u\.?s\.?\s*(?:route)?\s*-?\s*(\d+)/g, 'us$1');
 return value.replace(/[^a-z\d]/g, '');
}
function sameAddress(a, b) {
 const x = addressKey(a), y = addressKey(b);
 if (!/^(?:\d|[nesw]\d)/.test(x) || !/^(?:\d|[nesw]\d)/.test(y)) return false;
 if (x === y) return true;
 // Compare published street identity after optional direction, street suffix and units.
 const identity = s => s.replace(/^(\d+)(?:nw|ne|sw|se|n|s|e|w)(?=[a-z])/, '$1').replace(/(?:nw|ne|sw|se|n|s|e|w)$/, '').replace(/(?:ave|st|blvd|rd|dr|hwy|pkwy|ln|ct|cir)$/, '');
 return identity(x) === identity(y);
}
function officialUrl(value) {
 if (!value) return null;
 const u = new URL(decode(value), DIRECTORY);
 if (u.protocol !== 'https:' || u.hostname !== 'rivian.com' || u.username || u.password) throw Error('Unsafe official URL');
 return u.href;
}
function parseDirectory(html, { minimum = 100 } = {}) {
 if (!html.includes('Plan your next visit')) throw Error('Directory heading missing');
 const replacements = new Map([...html.matchAll(/<div hidden id="S:([^\"]+)">(.*?)<\/div>/gs)].map(m => [m[1], m[2]]));
 const articles = [...html.matchAll(/<article\b[^>]*>(.*?)<\/article>/gs)];
 if (articles.length < minimum) throw Error(`Incomplete directory: ${articles.length} articles; minimum ${minimum}`);
 const result = articles.map(([_, original]) => {
  const body = original.replace(/<template id="P:([^\"]+)"><\/template>/g, (_, id) => {
   if (!replacements.has(id)) throw Error(`Unresolved streamed heading ${id}`);
   return replacements.get(id);
  });
  const heading = body.match(/<h3>.*?<a[^>]*href="([^\"]+)"[^>]*>(.*?)<\/a>.*?<\/h3>/s);
  const paragraphs = [...body.matchAll(/<p\b[^>]*>(.*?)<\/p>/gs)].map(m => clean(m[1]));
  if (!heading || paragraphs.length < 2 || !paragraphs[0] || !paragraphs[1]) throw Error('Incomplete directory article');
  const sourceUrl = officialUrl(heading[1]);
  if (!new URL(sourceUrl).pathname.startsWith('/spaces/')) throw Error('Unexpected location link');
  const booking = [...body.matchAll(/href="([^\"]+)"/g)].find(m => m[1].startsWith('/demo-drive/book'));
  return { slug: new URL(sourceUrl).pathname.split('/').filter(Boolean).pop(), name: clean(heading[2]), address: paragraphs[0], cityLine: paragraphs[1], publishedText: paragraphs.slice(2).join('\n').trim(), bookingUrl: booking ? officialUrl(booking[1]) : null, sourceUrl };
 });
 if (new Set(result.map(x => x.slug)).size !== articles.length) throw Error('Duplicate directory slugs');
 return result;
}
// Read only JSON arguments; never execute source-page JavaScript. Delimiters inside
// quoted payloads (for example Tailwind's [body:has([data-footer-hidden])]) are data.
function flightText(html, url) {
 const chunks = [];
 for (const script of html.matchAll(/<script\b[^>]*>(.*?)<\/script>/gs)) {
  const source = script[1], calls = /\bself\.__next_f\.push\s*\(\s*/g;
  let call;
  while ((call = calls.exec(source))) {
   const start = calls.lastIndex;
   let depth = 0, quoted = false, escaped = false, end = -1;
   if (source[start] !== '[') throw Error(`Invalid official Flight data: ${url}`);
   for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
     if (escaped) escaped = false;
     else if (c === '\\') escaped = true;
     else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) {end = i + 1; break;}
   }
   if (end < 0 || !/^\s*\)/.test(source.slice(end))) throw Error(`Incomplete official Flight data: ${url}`);
   let value;
   try {value = JSON.parse(source.slice(start, end));}
   catch {throw Error(`Invalid official Flight data: ${url}`);}
   if (value[0] === 1) {
    if (typeof value[1] !== 'string') throw Error(`Invalid official Flight text: ${url}`);
    chunks.push(value[1]);
   }
   calls.lastIndex = end;
  }
 }
 return chunks.join('');
}
function parseDetail(html, url) {
 const objects = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => {
  try { return JSON.parse(decode(m[1])); } catch { throw Error(`Invalid official structured data: ${url}`); }
 });
 const business = objects.find(x => x.geo && (x.url === url || x['@id'] === url));
 const faq = objects.filter(x => x['@type'] === 'FAQPage').flatMap(x => x.mainEntity || []);
 const badges = [...html.matchAll(/<li[^>]*rounded-nano[^>]*>(.*?)<\/li>/gs)].map(m => clean(m[1]));
 const directionsUrl = [...html.matchAll(/href="([^\"]+)"/g)].map(m => decode(m[1])).find(u => /^https:\/\/maps\.app\.goo\.gl\//.test(u)) || null;
 const flight = flightText(html, url);
 let features = [];
 function walk(x) {
  if (!x || typeof x !== 'object') return;
  if (x.serviceCenterGeoJson?.features) features.push(...x.serviceCenterGeoJson.features);
  for (const value of Object.values(x)) if (value && typeof value === 'object') walk(value);
 }
 for (const line of flight.split('\n')) {
  try { walk(JSON.parse(line.slice(line.indexOf(':') + 1))); } catch { /* Flight import/text rows are not JSON objects. */ }
 }
 return { business, faq, badges, directionsUrl, features, sha256: hash(html) };
}
const EASTERN = ['CT','DE','DC','FL','GA','MA','MD','ME','MI','NC','NH','NJ','NY','OH','PA','RI','SC','VA','VT','WV'];
const CENTRAL = ['AL','AR','IA','IL','KS','LA','MN','MO','MS','OK','TN','TX','WI'];
function timezoneFor(state, city) {
 if (state === 'IN') return 'America/Indiana/Indianapolis';
 if (state === 'KY') return 'America/Kentucky/Louisville';
 if (EASTERN.includes(state)) return 'America/New_York';
 if (CENTRAL.includes(state)) return 'America/Chicago';
 if (['CA','NV','OR','WA'].includes(state)) return 'America/Los_Angeles';
 if (['CO','ID','MT','NM','UT','WY'].includes(state)) return 'America/Denver';
 if (state === 'AZ') return 'America/Phoenix';
 if (state === 'HI') return 'Pacific/Honolulu';
 if (state === 'AB') return 'America/Edmonton';
 if (state === 'BC') return 'America/Vancouver';
 if (state === 'ON') return 'America/Toronto';
 if (state === 'QC') return 'America/Toronto';
 return null;
}
function hoursFields(published) {
 const phones = [...published.matchAll(/(?:\+?1[ -]?)?\(\d{3}\)\s*\d{3}[ -]\d{4}/g)].map(m=>m[0]);
 const phone = phones[0] || '';
 let content = published.replace(phone, '').trim();
 const hoursExceptions = content.split('\n').filter(s => /closed on|holiday|special hours/i.test(s)).map(s => s.trim());
 content = content.split('\n').filter(s => !hoursExceptions.includes(s.trim())).join('\n').trim();
 const servicePlanned = /\bservice\s+(?:coming|opening)\s+soon\b/i.test(content);
 content = content.replace(/\bservice\s+(?:coming|opening)\s+soon\b/gi, '').trim();
 const chargingSplit = content.split(/(?:RAN Chargers|Charging hours)\s*:?\s*/i);
 content = chargingSplit[0].trim();
 const chargingPhone = chargingSplit.length>1 ? phones.slice(1)[0] || '' : '';
 const chargingHours = chargingSplit.length>1 ? chargingSplit.slice(1).join('\n').replace(chargingPhone,'').trim() || null : null;
 const split = content.split(/service hours\s*:?\s*/i);
 const hours = split[0].replace(/^general hours\s*:?\s*/i, '').trim() || null;
 const serviceHours = split.length > 1 ? split.slice(1).join('\n').trim() || null : null;
 return {phone,hours,serviceHours,hoursExceptions,serviceStatus:servicePlanned?'planned':serviceHours?'open':null,...(chargingHours?{chargingHours,chargingPhone}: {})};
}
function validCoordinates(lat, lng) { return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 75 && lng >= -180 && lng <= -40; }
function baseFields(x, date) {
 return { id: null, slug: x.slug, name: x.name, type: x.type, state: x.state, country: x.country, address: x.address, city: x.city, postalCode: x.postalCode || '', lat: null, lng: null, coordinatePrecision: 'unknown', coordinateSource: null, timezone: timezoneFor(x.state, x.city), timezoneSource: 'Derived from published North American locality and IANA timezone rules; not published by Rivian.', hours: null, serviceHours: null, phone: '', services: [], capabilities: [], status: 'unknown', rivianUrl: x.sourceUrl, bookingUrl: null, sourceUrl: x.sourceUrl, lastVerified: date, verificationStatus: 'verified', notes: [], hoursExceptions: [], sourceKind: x.sourceKind };
}
function directoryRecord(raw, detail, features, date) {
 const locality = raw.cityLine.match(/^(.+),\s*([A-Z]{2})\s+(.+)$/);
 if (!locality) throw Error(`Unparsed locality: ${raw.cityLine}`);
 const [, city, state, postalCode] = locality;
 const sourceHours = hoursFields(raw.publishedText);
 const type = /outpost/i.test(raw.name) ? 'Outpost' : /service|demo center/i.test(raw.name) || sourceHours.serviceHours || detail.badges?.some(x=>/service appointments/i.test(x)) ? 'Demo Center' : 'Space';
 const result = { ...baseFields({...raw,city,state,postalCode,type,country:['AB','BC','ON','QC'].includes(state)?'CA':'US',sourceKind:'directory'}, date), ...sourceHours, bookingUrl: raw.bookingUrl };
 if (result.hoursExceptions.length) { result.publishedHoursExceptions = result.hoursExceptions.slice(); result.notes.push(...result.hoursExceptions.map(x => `Published hours exception: ${x} (year not specified).`)); result.hoursExceptions = []; }
 result.capabilities = type === 'Outpost' ? ['outpost','charging'] : ['see-vehicles'];
 const offersService = result.serviceHours || detail.badges?.some(x=>/service appointments/i.test(x));
 if (offersService && result.serviceStatus !== 'planned') result.capabilities.push('service');
 if (result.serviceStatus === 'planned') result.notes.push('Service coming soon; the published general/demo hours apply to the currently operating visitor location.');
 if ((result.chargingHours || detail.badges?.some(x=>/ev charging/i.test(x))) && !result.capabilities.includes('charging')) result.capabilities.push('charging');
 const noDemo = detail.faq.some(f => /demo drive/i.test(f.name || '') && /not at this|no demo|not available/i.test(f.acceptedAnswer?.text || ''));
 if (result.bookingUrl && !noDemo) result.capabilities.push('demo-drive');
 if (noDemo && result.bookingUrl) {
  result.bookingUrl = null;
  result.notes.push('Official detail FAQ says demo drives are not offered here; the directory also displays a booking link. Confirm with Rivian.');
  result.verificationStatus = 'needs-review';
 }
 result.status = /coming soon|opening soon/i.test(raw.publishedText.replace(/service\s+(?:coming|opening)\s+soon/gi,'')) ? 'planned' : /temporarily closed/i.test(raw.publishedText) ? 'temporarily-closed' : result.hours || result.serviceHours ? 'open' : 'unknown';
 if (result.status === 'unknown') result.verificationStatus = 'needs-review';
 const listed = detail.business?.address;
 // Rivian's directory occasionally mistypes a street number (Charlotte: 3909 for 9309 Monroe Road).
 // When the detail page's address is the one on the official service map, with the same ZIP code
 // and phone number, those two official sources agree and their address and pin are used.
 const digits = value => String(value || '').replace(/\D/g, '').slice(-10);
 const corrected = listed?.streetAddress && listed.addressRegion === state && !sameAddress(listed.streetAddress, raw.address)
  ? features.find(f => f.properties.stateOrProvince === state && sameAddress(f.properties.address, listed.streetAddress) &&
    String(f.properties.postalCode || '').slice(0,5) === postalCode.slice(0,5) && digits(f.properties.phone).length === 10 && digits(f.properties.phone) === digits(result.phone))
  : null;
 const feature = features.find(f => f.properties.stateOrProvince === state && sameAddress(f.properties.address, raw.address)) || corrected;
 const geo = detail.business?.geo;
 if (feature && validCoordinates(feature.geometry.coordinates[1], feature.geometry.coordinates[0])) {
  // Only a different street number is a correction; "2512 Hawes" vs "2512 Hawes Ave" is the same
  // address written two ways, so the directory's fuller form stays.
  const number = value => (String(value || '').match(/^\s*(\d+)/) || [])[1];
  if (feature === corrected && number(feature.properties.address) !== number(raw.address)) {
   result.notes.push(`Rivian’s directory lists ${raw.address}; its detail page and service map both list ${clean(feature.properties.address)} with the same ZIP code and phone number, so that address and its map pin are used.`);
   result.address = clean(feature.properties.address); result.listedAddress = raw.address;
  }
  [result.lng,result.lat] = feature.geometry.coordinates;
  result.coordinateSource = `${SERVICE_SOURCE}#embedded-service-map`;
  result.coordinatePrecision = 'exact';
  result.officialServiceId = feature.properties.id;
  if (feature.properties.status === 'in_the_works' && result.status === 'open') {
   result.notes.push('The directory publishes operating hours but the embedded service map labels this site in the works. Confirm current availability with Rivian.'); result.verificationStatus = 'needs-review';
  }
 } else if (geo && sameAddress(detail.business.address?.streetAddress, raw.address) && detail.business.address?.addressRegion === state && validCoordinates(+geo.latitude,+geo.longitude)) {
  result.lat = +geo.latitude; result.lng = +geo.longitude; result.coordinatePrecision = 'exact'; result.coordinateSource = `${raw.sourceUrl}#structured-data`;
 } else if (geo) {
  result.notes.push(`Official detail structured data lists a different address (${detail.business.address?.streetAddress || 'unspecified'}); its coordinates were withheld. The directory address is used.`);
  result.verificationStatus = 'needs-review';
 }
 if (/Sat[–-]Sat:/i.test(result.serviceHours || '')) { result.notes.push('Published service hours contain “Sat–Sat”; Sunday service hours are unclear.'); result.verificationStatus = 'needs-review'; }
 if (detail.directionsUrl) result.officialDirectionsUrl = detail.directionsUrl;
 const pin = require('./location-coordinate-pins.json')[result.slug];
 if(result.coordinatePrecision==='unknown' && pin && result.state===pin.state && sameAddress(result.address,pin.address) && result.officialDirectionsUrl===pin.directions) {
  result.lat=pin.lat; result.lng=pin.lng; result.coordinatePrecision='map-pin'; result.coordinateSource=pin.directions;
 }

 if (feature && feature.properties.status === 'live' && result.serviceStatus !== 'planned' && !result.capabilities.includes('service')) { result.capabilities.push('service'); result.serviceStatus = 'open'; }
 result.services = result.capabilities.map(x => ({'see-vehicles':'See vehicles','demo-drive':'Demo drives',service:'Service appointments',outpost:'Charging outpost',charging:'Charging'})[x]);
 if (result.serviceStatus === 'planned') result.services.push('Service coming soon');
 result.verificationNote = result.coordinatePrecision === 'unknown' ? 'Published location facts were checked against official sources; a matching coordinate point is not available.' : 'Published location facts and a matching coordinate point were checked against official sources; this was not an on-site visit.';
 return result;
}
function serviceRecord(feature, date) {
 const p = feature.properties;
 const result = baseFields({slug:slugify(`${p.city}-${p.stateOrProvince}-${p.address}-service-center`),name:p.name,type:'Service Center',state:p.stateOrProvince,country:p.country,address:clean(p.address),city:p.city,postalCode:p.postalCode,sourceKind:'service-map',sourceUrl:SERVICE_SOURCE},date);
 // The shared map is embedded on a location page, but that URL belongs only to Calgary.
 result.rivianUrl = null;
 result.status = p.status === 'live' ? 'open' : p.status === 'in_the_works' ? 'planned' : 'unknown';
 result.serviceStatus = result.status;
 result.capabilities = ['service']; result.services = [result.status === 'planned' ? 'Service coming soon' : 'Service appointments']; result.phone = p.phone || '';
 result.officialServiceId = p.id;
 result.notes.push('Published in the service map embedded on Rivian’s official detail pages; not listed in the Spaces directory. Service visits require official scheduling.');
 if (result.status === 'planned') result.notes.push('Rivian labels this service site “in the works”; published service schedules do not establish an opening date.');
 if (validCoordinates(feature.geometry?.coordinates?.[1],feature.geometry?.coordinates?.[0])) {
  [result.lng,result.lat] = feature.geometry.coordinates; result.coordinatePrecision = 'exact'; result.coordinateSource = `${SERVICE_SOURCE}#embedded-service-map`;
 }
 const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
 const schedule = days.filter(d=>p[d]).map(d=>`${d[0].toUpperCase()+d.slice(1)}: ${p[d]}`);
 result.serviceHours = schedule.join('\n') || null;
 if (!result.address || !result.timezone || result.status === 'unknown') result.verificationStatus = 'needs-review';
 return result;
}
function legacyUnion(canonical, browser) {
 const byId = new Map();
 for (const record of [...canonical,...browser]) {
  if (!Number.isInteger(record.id)) throw Error('Legacy IDs must be integers');
  byId.set(record.id, {...byId.get(record.id),...record});
 }
 return [...byId.values()].sort((a,b)=>a.id-b.id);
}
function reconcile(records, legacy, date) {
 const used = new Set(); const duplicates = []; const next = []; let id = Math.max(0,...legacy.map(x=>x.id))+1;
 for (const record of records) {
  let matches = legacy.filter(x => !used.has(x.id) && ((x.slug && x.slug === record.slug) || (x.officialServiceId && x.officialServiceId === record.officialServiceId) || (x.state === record.state && sameAddress(x.address,record.address))));
  // Old city-only service placeholders can match only one explicit same-city service site.
  if (record.capabilities.includes('service')) {
   const candidates = legacy.filter(x => !used.has(x.id) && x.state === record.state && /service|demo center/i.test(x.type+' '+x.name) && !/^\d/.test(x.address || '') && [record.city.toLowerCase(),record.name.split(' - ')[0].toLowerCase()].includes(x.name.split(' - ')[0].toLowerCase()));
   const sameCity = records.filter(x=>x.state===record.state && x.city===record.city && x.capabilities.includes('service'));
   if (sameCity.length === 1) matches.push(...candidates.filter(x => !matches.some(y => y.id === x.id)));
  }
  matches.sort((a,b)=>a.id-b.id);
  record.id = matches[0]?.id ?? id++;
  const aliases = [...new Set(matches.flatMap(x=>[x.id,...(x.legacyIds || [])]))].filter(x=>x!==record.id);
  if (aliases.length) {record.legacyIds=aliases;duplicates.push({id:record.id,aliases});}
  // A merged record keeps the old page addresses, so links to a former duplicate still work.
  const slugs = [...new Set(matches.flatMap(x=>[x.slug,...(x.legacySlugs || [])]))].filter(x=>x && x!==record.slug);
  if (slugs.length) record.legacySlugs=slugs;
  for (const match of matches) used.add(match.id);
  next.push(record);
 }
 for (const old of legacy.filter(x=>!used.has(x.id))) {
  const city = String(old.city || old.name.split(' - ')[0]).split(',')[0];
  const retained = baseFields({slug:old.slug || `${slugify(old.name)}-legacy-${old.id}`,name:old.name,type:old.type,state:old.state,country:['AB','BC','ON','QC'].includes(old.state)?'CA':'US',address:old.address || '',city,sourceKind:'legacy',sourceUrl:DIRECTORY},null);
  Object.assign(retained,{id:old.id,verificationStatus:'needs-review',status:'unknown',notes:['Legacy record could not be matched to the current official directory or service map. Address is retained for review; coordinates, hours, phone and services have not been verified.'],legacySnapshot:old.legacySnapshot || {address:old.address,hours:old.hours,phone:old.phone,lat:old.lat,lng:old.lng,services:old.services,isOpen:old.isOpen}});
  if (old.legacyIds) retained.legacyIds=old.legacyIds;
  next.push(retained);
 }
 const ids=next.flatMap(x=>[x.id,...(x.legacyIds || [])]); if(new Set(ids).size!==ids.length)throw Error('Duplicate canonical/alias IDs');
 return { records:next.map(record => require('./listed-address-pins.cjs').applyListedAddressPin(record)).sort((a,b)=>a.id-b.id), duplicates };
}
const EMPTY_DETAIL = Object.freeze({ business: null, faq: [], badges: [], directionsUrl: null, features: [], sha256: null });
// A few unreadable detail pages (a transient error or one page's markup change) must not block
// the whole refresh. More than this many means the source format changed and needs a fix.
const maxDetailFailures = count => Math.max(3, Math.ceil(count * 0.1));
// The service map is embedded on every detail page; prefer the usual page, else any complete copy.
function serviceMapSource(details) {
 const preferred = details.get('calgary-service-demo-center');
 if (preferred && preferred.features.length >= 100) return { slug: 'calgary-service-demo-center', detail: preferred };
 const fallback = [...details].find(([, d]) => d.features.length >= 100);
 return fallback ? { slug: fallback[0], detail: fallback[1] } : null;
}
// Build directory records. A location whose detail page could not be read keeps its last published
// record unchanged, including its original verification date, rather than losing coordinates or
// services it had yesterday. A new location without a prior record uses the directory facts alone.
function officialRecords(raw, details, features, date, canonical, failures) {
 return raw.map(x => {
  const detail = details.get(x.slug);
  if (detail) return directoryRecord(x, detail, features, date);
  const failure = failures.find(f => f.slug === x.slug);
  const prior = canonical.find(p => p.slug === x.slug && p.sourceKind === 'directory');
  if (prior) return { ...prior, retainedDetail: { since: prior.retainedDetail?.since || prior.lastVerified, reason: failure?.error || 'Detail page unavailable' } };
  const record = directoryRecord(x, EMPTY_DETAIL, features, date);
  record.verificationStatus = 'needs-review';
  record.notes.push('The official detail page could not be read on this refresh; only directory facts are shown.');
  return record;
 });
}
async function download(url) {
 const response = await fetch(url,{signal:AbortSignal.timeout(45000)});
 if (!response.ok || !response.url.startsWith('https://rivian.com/')) throw Error(`Official fetch failed ${response.status}: ${url}`);
 return response.text();
}
async function refresh({date=new Date().toISOString().slice(0,10),directoryFile,detailsDir,apply=false,outputDir,baselineCanonicalFile,baselineBrowserFile}={}) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Use ISO verification date');
 const directoryHtml = directoryFile ? fs.readFileSync(directoryFile,'utf8') : await download(DIRECTORY);
 const raw = parseDirectory(directoryHtml);
 const details = new Map(), failures = []; let cursor=0;
 async function worker(){while(cursor<raw.length){const record=raw[cursor++];try{const html=detailsDir?fs.readFileSync(path.join(detailsDir,record.slug+'.html'),'utf8'):await download(record.sourceUrl);details.set(record.slug,parseDetail(html,record.sourceUrl));}catch(e){failures.push({slug:record.slug,url:record.sourceUrl,error:e.message});}}}
 await Promise.all(Array.from({length:4},worker));
 if (failures.length > maxDetailFailures(raw.length)) throw Error(`Too many unreadable official detail pages (${failures.length} of ${raw.length}); the source format may have changed:\n${failures.map(f=>`${f.url}: ${f.error}`).join('\n')}`);
 const mapSource = serviceMapSource(details);
 if (!mapSource) throw Error('Complete supplemental official service map missing');
 const sourceDetail = mapSource.detail;
 const unique = new Map();
 for (const feature of sourceDetail.features) {
  const p=feature.properties; if(!['US','CA'].includes(p.country))continue;
  const key=`${p.stateOrProvince}:${addressKey(p.address)}:${p.city}`;
  if(unique.has(key) && JSON.stringify(unique.get(key).geometry)!==JSON.stringify(feature.geometry))throw Error('Conflicting duplicate official service map coordinates');
  unique.set(key,feature);
 }
 const features=[...unique.values()];
 const canonical=JSON.parse(fs.readFileSync(baselineCanonicalFile || path.join(ROOT,'data/locations.json'),'utf8'));
 const official=officialRecords(raw,details,features,date,canonical,failures);
 const supplemental=features.filter(f=>!official.some(x=>x.officialServiceId===f.properties.id||(x.state===f.properties.stateOrProvince&&sameAddress(x.address,f.properties.address)))).map(f=>serviceRecord(f,date));
 const warnings=[...failures.map(f=>`Kept the last published record for ${f.slug}: its official detail page could not be read (${f.error}).`),
  ...(mapSource.slug!=='calgary-service-demo-center'?[`Read the official service map from ${mapSource.slug} because the usual page was unavailable.`]:[])];
 delete require.cache[require.resolve(path.join(ROOT,'js/locations.js'))];
 const browser=baselineBrowserFile ? JSON.parse(fs.readFileSync(baselineBrowserFile,'utf8')) : require(path.join(ROOT,'js/locations.js'));
 const legacy=legacyUnion(canonical,browser);
 const {records,duplicates}=reconcile([...official,...supplemental],legacy,date);
 if (new Set(records.map(x=>x.slug)).size !== records.length) throw Error('Duplicate canonical slugs');
 const added=records.filter(x=>!legacy.some(y=>y.id===x.id)).map(x=>({id:x.id,name:x.name,slug:x.slug,sourceKind:x.sourceKind}));
 const changed=records.filter(x=>legacy.some(y=>y.id===x.id)).map(x=>{const before=legacy.find(y=>y.id===x.id);const fields=Object.keys(x).filter(k=>JSON.stringify(before[k])!==JSON.stringify(x[k]));return {id:x.id,name:x.name,fields};}).filter(x=>x.fields.length);
 const summary={date,sourceUrl:DIRECTORY,directorySha256:hash(directoryHtml),directoryCount:raw.length,directorySlugs:raw.map(x=>x.slug),supplementalSourceUrl:SERVICE_SOURCE,supplementalMapPage:mapSource.slug,warnings,detailFailures:failures,supplementalMapSha256:sourceDetail.sha256,supplementalMapFeatureCount:features.length,supplementalAddedCount:supplemental.length,legacyCanonicalCount:canonical.length,legacyBrowserCount:browser.length,legacyUnionCount:legacy.length,totalCount:records.length,added,changed,mergedLegacyIds:duplicates,unmatchedLegacy:records.filter(x=>x.sourceKind==='legacy').map(x=>({id:x.id,name:x.name})),needsReview:records.filter(x=>x.verificationStatus==='needs-review').map(x=>({id:x.id,name:x.name,notes:x.notes})),coordinateCounts:records.reduce((a,x)=>(a[x.coordinatePrecision]=(a[x.coordinatePrecision]||0)+1,a),{}),officialDirectory:raw,detailSources:raw.map(x=>({url:x.sourceUrl,sha256:details.get(x.slug)?.sha256??null})),limitations:['Verification date records public source retrieval, not an on-site visit.','Directory hours take precedence over detail JSON-LD; structured coordinates require a matching address.','Supplemental service-map statuses and schedules are official embedded data, not confirmation of appointment availability.','Legacy unmatched claims are preserved only in legacySnapshot and excluded from current operating facts.','Timezone is derived from published locality; hours exceptions retain exact published dates without assuming a year.','Official photos are not copied; galleries are available via official detail links.']};
 const priorPath=path.join(ROOT,'data/location-history.json');
 const history=fs.existsSync(priorPath)?JSON.parse(fs.readFileSync(priorPath,'utf8')):{schemaVersion:1,baseline:{canonical,browser},events:[]};
 const eventIndex=history.events.findIndex(x=>x.date===date&&x.directorySha256===summary.directorySha256&&x.supplementalMapSha256===summary.supplementalMapSha256);
 const event={date,directorySha256:summary.directorySha256,supplementalMapSha256:summary.supplementalMapSha256,added,changed,mergedLegacyIds:duplicates,unmatchedLegacy:summary.unmatchedLegacy};
 if(eventIndex<0)history.events.push(event);else if (baselineCanonicalFile || baselineBrowserFile)history.events[eventIndex]=event;
 const target=apply?ROOT:outputDir;
 if(target){fs.mkdirSync(path.join(target,'data'),{recursive:true});for(const [name,value] of [['locations',records],['refresh-summary',summary],['location-history',history]])fs.writeFileSync(path.join(target,'data',name+'.json'),JSON.stringify(value,null,2)+'\n');if(apply)require('./generate-data.cjs').generate(ROOT);}
 return summary;
}
if(require.main===module){const args=process.argv.slice(2);const value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};refresh({date:value('--date'),directoryFile:value('--directory-file'),detailsDir:value('--details-dir'),apply:args.includes('--apply'),outputDir:value('--output-dir'),baselineCanonicalFile:value('--baseline-canonical-file'),baselineBrowserFile:value('--baseline-browser-file')}).then(x=>console.log(JSON.stringify({date:x.date,directoryCount:x.directoryCount,supplementalMapFeatureCount:x.supplementalMapFeatureCount,supplementalAddedCount:x.supplementalAddedCount,totalCount:x.totalCount,added:x.added.length,merged:x.mergedLegacyIds.length,unmatchedLegacy:x.unmatchedLegacy,coordinateCounts:x.coordinateCounts,needsReview:x.needsReview.length,applied:args.includes('--apply')},null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={officialRecords,serviceMapSource,maxDetailFailures,parseDirectory,parseDetail,addressKey,sameAddress,officialUrl,hoursFields,timezoneFor,legacyUnion,reconcile,directoryRecord,serviceRecord,refresh};
