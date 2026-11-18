/* Public data views share one validated browser snapshot. */
(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory;else factory(root.LocationModel,root.SpotterUI,root.SpotterSnapshot);})(typeof globalThis!=="undefined"?globalThis:this,function(M,U,store){
"use strict"; const e=M.escapeHtml; let photos={locations:{},categories:{}};
const regions = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  DC: "District of Columbia",
  MS: "Mississippi",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  PE: "Prince Edward Island",
  SK: "Saskatchewan",
  YT: "Yukon",
  AB: "Alberta",
  AZ: "Arizona",
  BC: "British Columbia",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  ON: "Ontario",
  OR: "Oregon",
  PA: "Pennsylvania",
  QC: "Quebec",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};
const typeColor = { Space: "space", "Demo Center": "demo", "Service Center": "service", Outpost: "outpost", RAN: "ran", Waypoint: "waypoint" };
const typeIconName = { Space: "space", "Demo Center": "drive", "Service Center": "service", Outpost: "outpost", RAN: "bolt", Waypoint: "plug" };
// Same photo rules as the iOS catalog. Category photos come from this site's own assets.
function photoFor(p) {
  const own = [p.id, ...(p.legacyIds || [])].map(String).map((id) => photos.locations[id]).find(Boolean);
  if (own && /^https:\/\/(media\.rivian\.com|photos\.plugshare\.com|cdn(8|10)\.localdatacdn\.com)\//.test(own.imageURL)) return { ...own, category: false };
  const types = M.locationTypes(p);
  if (types.some((t) => ["Space", "Outpost"].includes(t))) return null;
  const key = types.includes("RAN") ? "RAN" : types.includes("Waypoint") ? "Waypoint" : "";
  if (!key || !photos.categories[key]) return null;
  return { ...photos.categories[key], imageURL: key === "RAN" ? "/assets/charger-ran.jpg" : "/assets/charger-waypoint.jpg", category: true };
}
function typeKey(p) {
  return typeColor[p.type] || "space";
}
function tile(name, tone) {
  return `<span class="tile tile-${tone}">${U.icon(name)}</span>`;
}
function photoFigure(p, eager = true) {
  const photo = photoFor(p);
  if (!photo) return `<div class="place-photo place-photo-empty type-fill-${typeKey(p)}" aria-hidden="true">${U.icon(typeIconName[p.type] || "pin")}</div>`;
  const credit = photo.category ? "Category photo" : `Photo via ${e(photo.credit.replace(/^Photo via /, ""))}`;
  const source = ["rivian.com", "plugshare.com", "loc8nearme.com"].map((d) => M.safeUrl(photo.sourceURL, d)).find(Boolean);
  return `<figure class="place-photo"><img src="${e(photo.imageURL)}" alt="${e(photo.description || p.name)}"${eager ? "" : ' loading="lazy"'} decoding="async"><figcaption>${source && !photo.category ? `<a href="${e(source)}" target="_blank" rel="noopener">${credit} ${U.icon("external")}</a>` : credit}</figcaption></figure>`;
}
function placePage(p, { official, directions, booking, nearby, exceptionText }) {
  const country = p.country === "CA" ? "Canada" : p.country === "US" ? "United States" : e(p.country);
  const phone = p.phone ? p.phone.replace(/[^+\d]/g, "") : "";
  const statusPill = p.status === "planned" ? `<span class="pill pill-planned">${e(M.isCharging(p) ? M.permitLabel(p) : "Coming Soon")}</span>` : p.status === "temporarily-closed" ? '<span class="pill">Temporarily closed</span>' : "";
  const chips = (p.services || []).map((s) => `<span class="tag">${e(s)}</span>`).join("");
  const hours = M.isCharging(p)
    ? `<section class="card-section"><h2>${tile("bolt", "ran")}Charging</h2>${U.chargingDetails(p)}</section>`
    : `<section class="card-section"><h2>${tile("clock", "hours")}Hours</h2>${p.status === "planned" ? '<p class="notice">Coming soon.</p>' : ""}${p.status === "temporarily-closed" ? '<p class="notice">Temporarily closed. Check the official page for reopening information.</p>' : ""}<h3>Visiting hours</h3><p class="hours-text">${e(p.hours || "Visiting hours not listed.")}</p>${p.serviceHours ? `<h3>Service hours</h3><p class="hours-text">${e(p.serviceHours)}</p>` : ""}${p.serviceStatus === "planned" ? '<p class="notice warning">Service coming soon. The visiting hours above remain separate.</p>' : ""}${p.chargingHours ? `<h3>Charging hours</h3><p class="hours-text">${e(p.chargingHours)}</p>` : ""}${exceptionText ? `<p class="notice warning">Published schedule note: ${e(exceptionText)}. Check the official page for current exceptions.</p>` : ""}${p.timezone ? `<p class="fine-print">Times are local to ${e(p.timezone.replaceAll("_", " "))}.</p>` : ""}</section>${U.relatedPlaces(p.chargingStations, "Charging Nearby")}`;
  const links = [
    `<a href="/?location=${e(p.slug)}&view=map">${U.icon("map")}<span>${M.isMapped(p) ? "Show on Map" : "View in explorer"}</span>${U.icon("chevron")}</a>`,
    booking ? `<a href="${e(booking)}" target="_blank" rel="noopener">${U.icon("drive")}<span>Book a Demo Drive</span>${U.icon("external")}</a>` : "",
    official ? `<a href="${e(official.url)}" target="_blank" rel="noopener">${U.icon("external")}<span>${e(official.label)}</span>${U.icon("external")}</a>` : "",
    phone ? `<a href="tel:${e(phone)}">${U.icon("phone")}<span>Call ${e(p.phone)}</span>${U.icon("chevron")}</a>` : "",
  ].join("");
  const note = p.status === "planned" && M.isCharging(p) ? "This is a planned location, not an available charging stop." : M.isCharging(p) ? "Charger count and maximum power are published station details. Hours, pricing and connector availability can vary by site." : p.type === "Service Center" ? "Service visits may require an appointment. Confirm availability directly with Rivian." : "Demo-drive availability and vehicle displays can vary. Use the official page to check before making a special trip.";
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Map</a><span aria-hidden="true">/</span><a href="/regions/${p.state.toLowerCase()}/">${e(regions[p.state] || p.state)}</a></nav><div class="place-layout"><div class="place-main">${photoFigure(p)}<header class="page-header place-header"><div class="location-title"><h1>${e(p.name)}</h1>${U.locationGrade(p)}</div><div class="pill-row"><span class="pill type-fill-${typeKey(p)}">${e(U.locationTypeLabel(p))}</span>${statusPill}</div>${chips ? `<div class="chip-row">${chips}</div>` : ""}</header>${hours}${nearby.length ? section("More places in " + e(regions[p.state] || p.state) + ".", '<p>Straight-line distances from this location. Approximate pins are marked “Approx.”</p>' + nearby.map(other => linkRow(other, p)).join("")) : ""}</div><aside class="place-side"><section class="card-section"><h2>${tile("arrow", "address")}Address</h2><address>${e(M.addressLine(p))}<br>${e(p.city)}, ${e(p.state)} ${e(p.postalCode || "")}<br>${country}</address></section>${directions ? `<a class="button primary button-large" href="${e(directions)}" target="_blank" rel="noopener">${U.icon("arrow")}Directions</a>` : ""}<nav class="link-group" aria-label="Location links">${links}</nav><div class="utility-actions"><button class="button" type="button" data-save="${p.id}" aria-pressed="false">${U.icon("save")}Save</button><button class="button" type="button" data-share="${p.id}">${U.icon("share")}Share</button><a class="button" href="/contact.html?location=${e(p.slug)}">Report an update</a></div><section class="card-section"><h2>${tile("calendar", "record")}Record</h2>${M.sourceLine(p) ? `<p class="source-date">${e(M.sourceLine(p))}</p>` : ""}<p class="muted">${note}</p><p class="fine-print"><a href="/about.html#sources">About our sources</a></p></section></aside></div>`;
}
function galleryCard(p) {
  const types = M.locationTypes(p);
  const photo = photoFor(p);
  const media = photo ? `<img src="${e(photo.imageURL)}" alt="" loading="lazy" decoding="async">${photo.category ? '<span class="card-badge">Category photo</span>' : ""}` : `<span class="card-symbol" aria-hidden="true">${U.icon(typeIconName[p.type] || "pin")}</span>`;
  const line = M.isCharging(p) ? `${p.city}, ${p.state}` : (M.addressLine(p) || `${p.city}, ${p.state}`);
  return `<a class="gallery-card type-fill-${typeKey(p)}" href="${M.locationUrl(p)}" data-types="${e(types.join("|"))}" data-search="${e([p.name, p.city, p.state, regions[p.state] || "", p.displayAddress || p.address || ""].join(" ").toLowerCase())}">${media}<span class="card-text"><span class="card-type">${e(U.locationTypeLabel(p))}${p.status === "planned" ? " · Coming Soon" : ""}</span><strong>${e(p.name)}</strong><span class="card-line">${e(line)}</span></span></a>`;
}
function linkRow(p, origin = null) {
  const distance = origin ? M.placeDistanceLabel(origin, p) : null;
  return `<a class="link-row" href="${M.locationUrl(p)}"><span><strong>${e(p.name)}</strong><br><small>${e(U.locationTypeLabel(p))} · ${e(p.city)}, ${e(p.state)}${p.status === "planned" ? ` · ${e(M.permitLabel(p))}` : ""}</small>${origin ? `<span class="place-distance">${e(distance || "Distance unavailable")}</span>` : ""}</span>${U.icon("chevron")}</a>`;
}
function section(title, body) {
  return `<section class="content-section"><h2>${title}</h2>${body}</section>`;
}
const labels={added:'Added to the map','coming-soon':'Coming soon','now-active':'Now active',changed:'Details updated',relisted:'Back on the map','no-longer-listed':'No longer listed'};
function renderFeed(feed) {
  const entries=feed.days.flatMap(d=>d.entries),types=[...new Set(entries.map(x=>x.type))].sort();
  const latest=feed.latestCheck;
  const locationDate=latest && [latest.sourceDates.places,latest.sourceDates.charging].filter(Boolean).sort()[0];
  const freshness=locationDate?`Latest location information: <time datetime="${e(locationDate)}">${M.formatDate(locationDate)}</time>.`:'The first location report is on its way.';
  const detailDate=latest?.sourceDates.chargingDetails;
  const coverage=latest?.partialDetails?' Some charging details retain their last available information.':'';
  const count=feed.days[0]?new Set(feed.days[0].entries.map(x=>x.locationId)).size:0;
  function card(entry) {
    const summaries=entry.lines.filter(line=>!line.startsWith('Current schedule (local time):'));
    const extra=[...summaries.slice(3),...entry.lines.filter(line=>line.startsWith('Current schedule (local time):'))];
    const lines=summaries.slice(0,3).map(line=>`<li>${e(line)}</li>`);
    const rest=extra.length?`<details class="update-more"><summary>All changes (${entry.lines.length})</summary><ul>${extra.map(line=>`<li>${e(line)}</li>`).join('')}</ul></details>`:'';
    const kind=labels[entry.kind] || 'Details updated';
    return `<article class="location-update" data-update-card data-type="${e(entry.type)}" data-kind="${e(entry.kind)}" data-search="${e([entry.name,entry.city,entry.region,entry.type].join(' ').toLowerCase())}"><div class="update-card-top"><span class="update-kind update-kind-${e(entry.kind)}">${kind}</span><span class="update-type">${e(entry.type)}</span></div><h3><a href="${e(entry.url)}">${e(entry.name)}</a></h3>${entry.city&&!entry.name.includes(entry.city)?`<p class="update-locality">${e([entry.city,entry.region].filter(Boolean).join(', '))}</p>`:''}<ul>${lines.slice(0,3).join('')}</ul>${rest}${entry.chargerReport?'<p class="update-caveat">Reported at the daily check; not live charger availability.</p>':''}<a class="update-location-link" href="${e(entry.url)}">View location <span aria-hidden="true">→</span></a></article>`;
  }
  return `<header class="page-header updates-header"><h1>Location updates</h1><p>New places, coming-soon announcements, and changes to the stops you know.</p></header><div class="updates-intro"><p>${freshness}${detailDate&&detailDate!==locationDate?` Charging details: ${M.formatDate(detailDate)}.`:''}${coverage} Checked daily.</p><a href="/">Open the map</a></div><div class="updates-toolbar" data-update-controls hidden><div class="form-field"><label for="update-search">Find a location</label><input id="update-search" type="search" placeholder="City, state, or location" autocomplete="off"></div><div class="form-field"><label for="update-type">Location type</label><select id="update-type"><option value="">All location types</option>${types.map(type=>`<option value="${e(type)}">${e(type)}</option>`).join('')}</select></div><div class="form-field"><label for="update-kind">Show</label><select id="update-kind"><option value="">All changes</option>${Object.entries(labels).map(([kind,label])=>`<option value="${kind}">${label}</option>`).join('')}</select></div><button type="button" class="button" id="update-reset">Reset</button></div><p class="updates-result" id="update-results" role="status" aria-live="polite">${count?`${count} locations in the latest report`:'No recorded changes yet.'}</p><div class="updates-timeline">${feed.days.map(day=>`<section class="updates-day" data-update-day id="day-${e(day.date)}"><div class="updates-date"><h2><time datetime="${e(day.date)}">${M.formatDate(day.date)}</time></h2><span>${new Set(day.entries.map(x=>x.locationId)).size} locations</span><a href="#day-${e(day.date)}" aria-label="Link to ${M.formatDate(day.date)} report">#</a></div><div class="updates-grid">${day.entries.map(card).join('')}</div></section>`).join('')}</div><p class="notice" id="updates-empty" hidden>No updates match these filters. Try another location or reset your filters.</p><p class="updates-note">Dates show when changes were recorded on RivSpotter. A newly listed location may already be open. Looking for website improvements? <a href="/changelog.html">Read the changelog.</a></p>`;
}
const typeCards = [['RAN','Rivian Adventure Network','DC fast charging'],['Waypoint','Waypoints','Level 2 charging'],['Space','Spaces','See the vehicles'],['Demo Center','Demo Centers','Take a demo drive'],['Service Center','Service Centers','Service appointments'],['Outpost','Outposts','Charge and explore']];
const heading=(title,body='')=>`<header class="page-header"><h1>${e(title)}</h1>${body?`<p>${e(body)}</p>`:''}</header>`;
function gallery(list){
 const sorted=[...list].sort((a,b)=>a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id)));
 return `<header class="page-header gallery-header"><h1>All Locations</h1><p>${sorted.length} places across North America</p></header><div class="gallery-tools" data-gallery-controls><div class="search-field"><label for="gallery-search" class="sr-only">Find a location</label><input id="gallery-search" type="search" placeholder="Find a location" autocomplete="off"></div><div class="type-chips" role="group" aria-label="Location type"><button type="button" data-gallery-type="" aria-pressed="true">All types</button>${typeCards.map(([type,name])=>`<button type="button" data-gallery-type="${e(type)}" aria-pressed="false"><i class="legend-dot type-fill-${typeColor[type]}"></i>${e(type==='RAN'?'RAN':name.replace(/s$/,''))}</button>`).join('')}</div></div><p id="gallery-count" class="muted gallery-count" role="status" aria-live="polite"></p><div class="gallery-grid" id="gallery">${sorted.map(galleryCard).join('')}</div><p class="notice" id="gallery-empty" hidden>No places match. Try another name, city or state.</p>`;
}
function browse(list){
 const states=[...new Set(list.map(p=>p.state))].filter(Boolean).sort((a,b)=>(regions[a]||a).localeCompare(regions[b]||b));
 return heading('Browse')+`<section class="browse-section"><h2>Location types</h2><div class="type-grid">${typeCards.map(([type,name,blurb])=>`<a class="type-card" href="/?type=${encodeURIComponent(type)}">${tile(typeIconName[type],typeColor[type])}<strong>${e(name)}</strong><span>${e(blurb)}</span><span class="type-count">${list.filter(p=>M.locationTypes(p).includes(type)).length}</span></a>`).join('')}</div></section><section class="browse-section"><h2>States and provinces</h2><div class="card-list">${states.map(s=>`<a class="link-row" href="/regions/${e(s.toLowerCase())}/"><strong>${e(regions[s]||s)}</strong><span class="muted">${list.filter(p=>p.state===s).length}</span>${U.icon('chevron')}</a>`).join('')}</div></section><section class="browse-section"><h2>More</h2><div class="card-list">${[['Location updates','/updates.html'],['Location data','/stats.html'],['Changelog','/changelog.html'],['About','/about.html'],['Privacy','/privacy.html'],['Report an update','/contact.html']].map(([n,h])=>`<a class="link-row" href="${h}"><strong>${n}</strong>${U.icon('chevron')}</a>`).join('')}</div></section>`;
}
function region(list,state){const items=list.filter(p=>p.state===state).sort((a,b)=>a.name.localeCompare(b.name));return heading(regions[state]||state,`${items.length} ${items.length===1?'place':'places'}. Check each page for current hours, services and official links.`)+`<a class="button" href="/?state=${e(state)}&view=map">${U.icon('map')}Show ${e(regions[state]||state)} on the map</a><section class="content-section card-list">${items.map(p=>linkRow(p)).join('')}</section><p><a href="/regions/">Browse all states and provinces</a></p>`;}
function overview(list,snapshot){
 const latest=list.map(p=>p.lastVerified||'').sort().at(-1),states=new Set(list.map(p=>p.state).filter(Boolean));const additions=[...(snapshot.summary.added||[]),...(snapshot.chargingSummary.added||[])];
 const counts=list.reduce((a,p)=>{for(const t of M.locationTypes(p))a[t]=(a[t]||0)+1;return a},{});
 return heading('Location data',`Last source refresh ${M.formatDate(latest)}. Counts describe this directory, not Rivian’s total operating footprint.`)+`<div class="stat-strip"><div><strong>${list.length}</strong><span>Places in the directory</span></div><div><strong>${states.size}</strong><span>States &amp; provinces</span></div><div><strong>${additions.length}</strong><span>Places added this refresh</span></div></div>`+(list.some(p=>p.roamer)?section('Charging Network Reports',`<p>Location grades, connector details, pricing, and explicit charger issue reports are checked daily. These reports are snapshots, not live availability.</p>${list.filter(p=>U.hasReportedIssue(p.roamer?.reportedStatus)).map(p=>`<p><a href="${e(M.locationUrl(p))}">${e(p.name)}</a> — Reported as ${e(p.roamer.reportedStatus)} · ${e(M.formatDate(p.roamer.observedAt))}</p>`).join('')}`):'')+section('Location types.',Object.entries(counts).map(([t,n])=>`<p><strong>${n}</strong> ${e(U.typeLabel(t))} locations</p>`).join(''))+section('Follow the changes.','<p><a href="/updates.html">See the latest directory updates →</a></p><p><a href="/regions/">Browse all states and provinces →</a></p>');
}
function detailPage(list,p){
 const official=M.getOfficialLink(p),directions=M.getDirectionsUrl(p),booking=M.safeUrl(p.bookingUrl,'rivian.com');
 const nearby=list.filter(x=>x.id!==p.id&&x.state===p.state&&x.country===p.country).sort((a,b)=>{const da=M.isMapped(p)&&M.isMapped(a)?M.distanceMiles(p,a):Infinity,db=M.isMapped(p)&&M.isMapped(b)?M.distanceMiles(p,b):Infinity;return da===db?String(a.id).localeCompare(String(b.id),'en'):da-db;}).slice(0,4);
 const exceptionText=(p.hoursExceptions||[]).map(v=>typeof v==='string'?v:v.note||v.raw||v.text||(v.date?`${v.date}: ${v.closed?'Closed':v.hours||'Special hours'}`:'')).filter(Boolean).join('; ');
 return placePage(p,{official,directions,booking,nearby,exceptionText});
}
function classify(pathname){
 if(pathname==='/locations/'||pathname==='/locations')return {kind:'gallery'};
 if(pathname==='/regions/'||pathname==='/regions')return {kind:'browse'};
 if(pathname==='/updates.html')return {kind:'updates'};
 if(pathname==='/stats.html')return {kind:'stats'};
 if(pathname==='/changelog.html')return {kind:'changelog'};
 let m=pathname.match(/^\/locations\/([a-z0-9-]+)\/?$/);if(m)return {kind:'location',slug:m[1]};
 m=pathname.match(/^\/regions\/([a-z]{2})\/?$/);if(m)return {kind:'region',state:m[1].toUpperCase()};
 return {kind:'missing'};
}
if(typeof document==='undefined')return {gallery,browse,region,overview,detailPage,classify};
let current=null,pending=null,loadedId='',all=[];const container=document.getElementById('dynamic-content');
const initialRoute=classify(location.pathname),activeNav=initialRoute.kind==='gallery'?'Locations':initialRoute.kind==='browse'||initialRoute.kind==='region'?'Browse':'';const siteHeader=document.querySelector('[data-site-header]');if(siteHeader)siteHeader.innerHTML=U.header(activeNav);
function filters(){
 const gallerySearch=document.getElementById('gallery-search');if(gallerySearch){const terms=gallerySearch.value.toLowerCase().split(/\s+/).filter(Boolean),type=document.querySelector('[data-gallery-type][aria-pressed="true"]')?.dataset.galleryType||'';let count=0;for(const card of document.querySelectorAll('.gallery-card')){card.hidden=!!((type&&!card.dataset.types.split('|').includes(type))||terms.some(x=>!card.dataset.search.includes(x)));if(!card.hidden)count++;}document.getElementById('gallery-count').textContent=`${count} ${count===1?'place':'places'}`;document.getElementById('gallery-empty').hidden=count>0;const query=new URLSearchParams();if(gallerySearch.value.trim())query.set('q',gallerySearch.value.trim());if(type)query.set('type',type);history.replaceState({},'',location.pathname+(query.size?'?'+query:''));}
 const search=document.getElementById('update-search');if(search){const type=document.getElementById('update-type').value,kind=document.getElementById('update-kind').value,terms=search.value.toLowerCase().split(/\s+/).filter(Boolean);let n=0;for(const card of document.querySelectorAll('[data-update-card]')){card.hidden=!!((type&&card.dataset.type!==type)||(kind&&card.dataset.kind!==kind)||terms.some(t=>!card.dataset.search.includes(t)));if(!card.hidden)n++;}for(const day of document.querySelectorAll('[data-update-day]'))day.hidden=![...day.querySelectorAll('[data-update-card]')].some(c=>!c.hidden);document.getElementById('update-results').textContent=`${n} location update${n===1?'':'s'}`;document.getElementById('updates-empty').hidden=n!==0;}
}
function saved(){try{const x=JSON.parse(localStorage.getItem('rivian-spotter-saved')||localStorage.getItem('rivian_favorites')||localStorage.getItem('rivianFavorites')||'[]');return Array.isArray(x)?x.map(y=>Number(typeof y==='object'?y.id:y)).filter(Number.isFinite):[];}catch{return [];}}
function metadata(title,p){document.title=`${title} · RivSpotter`;const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href='https://rivspotter.com'+(p?M.locationUrl(p):location.pathname);let structured=document.getElementById('dynamic-structured');if(structured)structured.remove();if(p){structured=document.createElement('script');structured.id='dynamic-structured';structured.type='application/ld+json';structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Place',name:p.name,url:'https://rivspotter.com'+M.locationUrl(p),address:{'@type':'PostalAddress',streetAddress:p.displayAddress||p.address,addressLocality:p.city,addressRegion:p.state,addressCountry:p.country},...(M.isMapped(p)?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lng}}:{})}).replace(/</g,'\\u003c');document.head.append(structured);}}
function render(snapshot){
 if(!snapshot||snapshot.snapshotId===loadedId)return;loadedId=snapshot.snapshotId;current=snapshot;photos=snapshot.photos;all=M.combineLocations(snapshot.locations,snapshot.charging,snapshot.roamer);const list=all.filter(p=>p.listed!==false),route=classify(location.pathname),priorSearch=document.getElementById('gallery-search')?.value||document.getElementById('update-search')?.value||'',priorType=document.querySelector('[data-gallery-type][aria-pressed="true"]')?.dataset.galleryType||document.getElementById('update-type')?.value||'',priorKind=document.getElementById('update-kind')?.value||'';let html,title,p;
 if(route.kind==='gallery'){html=gallery(list);title='All Locations';}
 else if(route.kind==='browse'){html=browse(list);title='Browse';}
 else if(route.kind==='region'){html=region(list,route.state);title=regions[route.state]||route.state;}
 else if(route.kind==='stats'){html=overview(list,snapshot);title='Location data';}
 else if(route.kind==='updates'){const clean={...snapshot.updates,days:snapshot.updates.days.map(d=>({...d,entries:d.entries.map(x=>({...x,url:/^\/locations\/[a-z0-9-]+\/$/.test(x.url||'')?x.url:'/locations/'}))}))};html=renderFeed(clean);title='Location updates';}
 else if(route.kind==='changelog'){html=heading('Changelog','New features, improvements, and fixes to RivSpotter.')+`<div class="changelog">${snapshot.changelog.map(entry=>`<article class="changelog-entry"><div class="changelog-meta">${entry.date?`<time datetime="${e(entry.date)}">${e(M.formatDate(entry.date))}</time>`:''}<span class="tag">${e(entry.version)}</span></div><h2>${e(entry.title)}</h2><ul>${(entry.changes||[]).map(change=>`<li>${e(change)}</li>`).join('')}</ul></article>`).join('')}</div>`;title='Changelog';}
 else if(route.kind==='location'&&(p=all.find(x=>x.slug===route.slug||(x.legacySlugs||[]).includes(route.slug)))){html=detailPage(list,p);title=p.name;}
 else {html=heading('Page not found','This location may have moved, or the address may be incomplete.')+'<a class="button primary" href="/">Back to the map</a>';title='Page not found';}
 const position=window.scrollY;container.innerHTML=html;document.querySelector('main').classList.toggle('location-page',route.kind==='location');metadata(title,p);if(route.kind==='location'&&p){document.body.dataset.slug=p.slug;for(const b of container.querySelectorAll('[data-save]')){const on=saved().some(id=>id===p.id||(p.legacyIds||[]).includes(id));b.setAttribute('aria-pressed',String(on));b.innerHTML=U.icon('save')+(on?'Saved':'Save');}}
 const search=document.getElementById('gallery-search')||document.getElementById('update-search');if(search)search.value=priorSearch||new URLSearchParams(location.search).get('q')||'';if(route.kind==='gallery'){const wanted=priorType||new URLSearchParams(location.search).get('type')||'';for(const b of container.querySelectorAll('[data-gallery-type]'))b.setAttribute('aria-pressed',String(b.dataset.galleryType===wanted));}if(document.getElementById('update-type'))document.getElementById('update-type').value=priorType;if(document.getElementById('update-kind'))document.getElementById('update-kind').value=priorKind;const controls=container.querySelector('[data-update-controls]');if(controls)controls.hidden=false;filters();window.scrollTo(0,position);
}
container.addEventListener('input',filters);container.addEventListener('change',filters);container.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-gallery-type')){for(const x of container.querySelectorAll('[data-gallery-type]'))x.setAttribute('aria-pressed',String(x===b));filters();}if(b.id==='update-reset'){document.getElementById('update-search').value='';document.getElementById('update-type').value='';document.getElementById('update-kind').value='';filters();}if(b.dataset.save){const id=Number(b.dataset.save),arr=saved(),place=all.find(x=>x.id===id),equivalent=[id,...(place?.legacyIds||[])],on=arr.some(x=>equivalent.includes(x));try{localStorage.setItem('rivian-spotter-saved',JSON.stringify(on?arr.filter(x=>!equivalent.includes(x)):[...arr,id]));b.setAttribute('aria-pressed',String(!on));b.innerHTML=U.icon('save')+(on?'Save':'Saved');}catch{}}if(b.dataset.share){const p=all.find(x=>String(x.id)===b.dataset.share);if(p){const url='https://rivspotter.com'+M.locationUrl(p);try{if(navigator.share)await navigator.share({title:p.name+' · RivSpotter',url});else await navigator.clipboard.writeText(url);}catch{}}}});
document.addEventListener('spotter:snapshot',ev=>{if(document.activeElement&&container.contains(document.activeElement)){pending=ev.detail;return;}render(ev.detail);});document.addEventListener('focusout',()=>setTimeout(()=>{if(pending&&!container.contains(document.activeElement)){const x=pending;pending=null;render(x);}},0));
store.refresh().then(render).catch(()=>{container.innerHTML=heading('Locations couldn’t load','Check your connection and try again.')+'<button class="button" onclick="location.reload()">Try again</button>';});
return {gallery,browse,region,overview,detailPage,classify};
});
