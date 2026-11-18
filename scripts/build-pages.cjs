const fs = require("node:fs"),
  path = require("node:path");
const M = require("../js/location-model.js"),
  U = require("../js/components.js"),
  e = M.escapeHtml;
const BASE = "https://rivspotter.com";
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
function shell({
  title,
  description,
  url,
  active = "",
  page = "",
  slug = "",
  content,
  structured,
}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)"><title>${e(title)} · RivSpotter</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${BASE}${url}"><meta property="og:title" content="${e(title)} · RivSpotter"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${BASE}${url}"><meta property="og:site_name" content="RivSpotter"><meta property="og:image" content="https://rivspotter.com/assets/spotter-social-card.png"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="RivSpotter. Find your next stop. Your guide to Rivian places and charging."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://rivspotter.com/assets/spotter-social-card.png"><meta name="twitter:image:alt" content="RivSpotter. Find your next stop. Your guide to Rivian places and charging."><meta name="twitter:title" content="${e(title)} · RivSpotter"><meta name="twitter:description" content="${e(description)}"><link rel="icon" href="/assets/spotter-route-icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/style.css"><script defer src="/js/components.js"></script>${page === "gallery" ? '<script defer src="/js/gallery.js"></script>' : page ? '<script defer src="/js/location-model.js"></script><script defer src="/js/locations.js"></script><script defer src="/js/charging.js"></script><script defer src="/js/roamer.js"></script><script defer src="/js/snapshot-store.js"></script><script defer src="/js/app.js"></script>' : ""}${structured ? '<script type="application/ld+json">' + JSON.stringify(structured).replace(/</g, "\\u003c") + "</script>" : ""}<script defer src="https://tinylytics.app/js/script.js" data-site="jj-9YE1ymyozj9wFfy7d"></script></head><body data-page="${page}"${slug ? ' data-slug="' + e(slug) + '"' : ""}>${U.header(active)}<main id="main" class="page ${page === "location" ? "location-page" : ""}">${content}${U.footer()}</main><div id="toast" class="toast" role="status" hidden></div></body></html>`;
}
const photos = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/location-photos.json"), "utf8"));
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
function buildPages(dist, list, summary = {}) {
  const routes = [];
  const routable = list;
  list = list.filter(p => p.listed !== false);
  function write(url, html) {
    const file = url.endsWith("/") ? url + "index.html" : url;
    fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
    fs.writeFileSync(path.join(dist, file), html);
    routes.push(url);
  }
  const latest = list
      .map((p) => p.lastVerified || "")
      .sort()
      .at(-1),
    states = [...new Set(routable.map((p) => p.state))].filter(Boolean).sort(),
    official = list.filter((p) => p.sourceKind === "directory");
  const additions = [...(summary.added || []), ...(summary.charging?.added || [])];
  const header = (_eyebrow, title, body) =>
    `<header class="page-header"><h1>${title}</h1>${body ? `<p>${body}</p>` : ""}</header>`;
  write(
    "/saved.html",
    shell({
      title: "Saved places",
      description:
        "Keep the Rivian places you want to visit in one simple list on this device.",
      url: "/saved.html",
      active: "Saved",
      page: "saved",
      content:
        header(
          "",
          "Saved",
          "Places you save while exploring. They stay in this browser, with no account.",
        ) +
        '<p id="saved-count" class="muted">Loading your saved places…</p><div id="saved-results" class="saved-list"></div>' +
        section(
          "Saved here, on this device.",
          "<p>Your list stays in this browser. There is no account, and it does not sync between devices. Clearing browser data removes it.</p>",
        ),
    }),
  );
  write(
    "/about.html",
    shell({
      title: "About",
      description:
        "An independent guide to Rivian places, with addresses, hours and links from official sources.",
      url: "/about.html",
      active: "About",
      content:
        header(
          "",
          "About",
          "RivSpotter brings Rivian’s places into one useful map, so you can decide where to go and what to expect.",
        ) +
        `<div class="content-grid">${section("A place for every kind of visit.", '<p>Explore Spaces to see the vehicles, find a location offering demo drives, check a service address, or make an Outpost part of a trip.</p><p>Each location page brings together its published address, contact details, hours, and official links. Filters use the capabilities confirmed by Rivian’s sources.</p><p><a href="/regions/">Browse the regional directory →</a></p>')}${section("Built for a useful next step.", "<p>Save a shortlist, share an individual place, and get directions for your next visit. General opening hours and service hours remain separate.</p><p>RivSpotter is independently maintained and is not affiliated with or endorsed by Rivian Automotive. Rivian names and trademarks belong to their owners.</p>")}</div><section id="sources" class="content-section"><h2>Information from Rivian.</h2><p>Location information comes from <a href="https://rivian.com/spaces/locations" target="_blank" rel="noopener">Rivian’s official location directory</a>, its location pages, its service-center map, and its <a href="https://rivian.com/experience/charging#map" target="_blank" rel="noopener">charging map</a>. Location pages include official links and the latest source refresh date.</p><p>Opening hours use the destination’s local time zone. Visiting, service, and charging hours are listed separately where published. Service visits and demo drives can be arranged directly with Rivian.</p><p>This directory includes Rivian Adventure Network and Waypoint charging locations from Rivian’s public charging map. Charger counts, published maximum power and access are shown on station pages. Map pins come from the official map; directions use the published station address when available. These are station details, not live charger availability. Charging details include pricing, connectors, location grades, and reported issues. Each snapshot has its own capture date. Charging information is refreshed daily. Announced future locations are labeled Coming Soon with approximate city pins; addresses and station details appear when published. Nearby charging and Rivian places link to each other without merging their services or hours.</p></section>${section("Privacy, in plain language.", '<p>Saved places and theme preferences stay in your browser. “Near me” requests your location only when you tap it; coordinates are used locally to sort places and are not saved by RivSpotter. The map provider receives normal map requests for the area you view.</p><p>Maps are provided by Mapbox and its data partners. Their <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener">privacy policy</a> applies to map use. We use Tinylytics for site-usage analytics. We do not add advertising trackers. A service worker stores public pages and location data on your device for faster repeat visits and limited offline access.</p><p>Correction reports open an email draft in your own mail app. Nothing is sent until you send it.</p>')}${section("Help keep the map useful.", '<p>A moved address, new opening, or changed schedule is worth sharing.</p><p><a class="button" href="/contact.html">Report an update</a></p>')}`,
    }),
  );
  write(
    "/privacy.html",
    shell({
      title: "Privacy",
      description:
        "How the RivSpotter website and iOS app handle your location, saved places, visits, and data.",
      url: "/privacy.html",
      content:
        header(
          "",
          "Privacy",
          "RivSpotter has no accounts, no advertising, and no tracking across apps or sites. Here is exactly what the website and the iOS app do with your information.",
        ) +
        section(
          "The iOS app.",
          "<p><strong>Visits, notes, saved places, and Base Camp</strong> are stored on your device. When you’re signed in to iCloud, they also sync through your own private iCloud database, which only you can access. RivSpotter never receives or sees them. Exporting your journal creates a file you choose where to save.</p>" +
            "<p><strong>Location.</strong> The app asks for your location when you sort by Nearest or tap Near me on the map. It takes a single reading to sort places and center the map. Your location is not saved, synced, or sent to RivSpotter.</p>" +
            "<p><strong>The check-in widget</strong> uses your location on your device to suggest the nearest Rivian place and to let you check in with one tap. Visits you record from the widget are stored on your device and sync through iCloud the next time you open the app. <strong>Arrival updates</strong> are optional and off by default. If you turn on “Update widget when I arrive,” iOS wakes the app briefly when you reach a nearby Rivian place so the widget is ready; this requires Always location and happens entirely on your device. Your location is never saved, synced, or sent to RivSpotter. The medium widget’s map image comes from Apple Maps, like the app’s maps. Turning the setting off stops arrival updates.</p>" +
            "<p><strong>Network requests.</strong> The app downloads the public location directory from rivspotter.com and loads location photos from their hosts (Rivian, PlugShare, and Loc8NearMe). Maps and directions use Apple Maps. These requests include standard information such as your IP address, as any internet request does.</p>" +
            "<p><strong>Visit receipts</strong> show the place and date, never your notes, and are shared only when you choose to share them.</p>" +
            "<p>The app contains no analytics, advertising, or tracking code.</p>",
        ) +
        section(
          "The website.",
          "<p>Saved places and theme preferences stay in your browser. “Near me” requests your location only when you tap it; coordinates are used in your browser to sort places and are not saved by RivSpotter.</p>" +
            '<p>Maps are provided by Mapbox and its data partners, whose <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener">privacy policy</a> applies to map use. We use Tinylytics for privacy-friendly site-usage counts. A service worker stores public pages and location data on your device for faster repeat visits and offline access.</p>' +
            "<p>Correction reports open an email draft in your own mail app. Nothing is sent until you send it.</p>",
        ) +
        section(
          "Your choices.",
          "<p>You can delete visits, saved places, or Base Camp in the app at any time; deleting the app removes its data from your device, and you can remove its iCloud data in your device’s iCloud settings. Location access can be changed in Settings.</p>" +
            '<p>Questions? Email <a href="mailto:support@rivspotter.com">support@rivspotter.com</a>.</p>' +
            "<p>RivSpotter is independently maintained and is not affiliated with or endorsed by Rivian Automotive.</p>" +
            '<p class="muted">Effective October 24, 2026.</p>',
        ),
    }),
  );
  write(
    "/contact.html",
    shell({
      title: "Report an update",
      description:
        "Share a new Rivian location, corrected address or updated hours with RivSpotter.",
      url: "/contact.html",
      page: "contact",
      content:
        header(
          "",
          "Report an update",
          "Send a correction, suggest a new location, or let us know what could work better.",
        ) +
        `<div class="content-grid"><section><form id="contact-form"><div class="form-field"><label for="contact-location">Location name <span class="muted">(optional)</span></label><input id="contact-location" name="location" maxlength="160" placeholder="e.g. Venice Space"></div><div class="form-field"><label for="contact-kind">What needs updating?</label><select id="contact-kind"><option>Location details</option><option>New location</option><option>Hours or temporary closure</option><option>Map or website issue</option><option>Other feedback</option></select></div><div class="form-field"><label for="contact-message">What should we know?</label><textarea id="contact-message" name="message" required maxlength="5000" placeholder="Tell us what changed and what the correct information should be."></textarea></div><div class="form-field"><label for="contact-source">Official source link <span class="muted">(optional)</span></label><input id="contact-source" type="url" name="source" placeholder="https://rivian.com/…"></div><button class="button primary" type="submit">Prepare email ${U.icon("arrow")}</button><p class="muted" style="font-size:.8rem;margin-top:12px">Opens a draft in your mail app. Review it there before sending.</p><p id="contact-status" class="notice" style="margin-top:20px" role="status" hidden>Your mail app should open with a draft. If it doesn’t, email support@rivspotter.com directly. This form has not sent a message.</p></form></section><aside class="stack" style="align-content:start"><h2>Every good detail helps.</h2><p class="muted">An official link, complete address, or photo of posted hours can help us update the directory.</p><p class="muted">For vehicle support, service appointments, or booking changes, contact Rivian directly.</p><a href="mailto:support@rivspotter.com">support@rivspotter.com</a><a href="https://rivian.com/support" target="_blank" rel="noopener">Rivian support →</a></aside></div>`,
    }),
  );
  write("/updates.html", shell({
    title: "Location Updates", description: "New Rivian locations, coming-soon announcements, and changes to charging, hours, and site details.",
    url: "/updates.html", active: "Updates",
    content: require('./build-location-updates.cjs').renderFeed(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/location-updates.json'),'utf8')))
  }));
  const summaryBlock = `<div class="stat-strip"><div><strong>${list.length}</strong><span>Places in the directory</span></div><div><strong>${states.length}</strong><span>States & provinces</span></div><div><strong>${additions.length}</strong><span>Places added this refresh</span></div></div>`;
  write(
    "/changelog.html",
    shell({
      title: "Changelog",
      description: "New features, improvements, and fixes to RivSpotter.",
      url: "/changelog.html",
      content: header("", "Changelog", "New features, improvements, and fixes to RivSpotter.") +
        `<div class="changelog">${require("../data/site-changelog.json").map(entry=>`<article class="changelog-entry"><div class="changelog-meta">${entry.date ? `<time datetime="${e(entry.date)}">${M.formatDate(entry.date)}</time>` : ""}<span class="tag">${e(entry.version)}</span></div><h2>${e(entry.title)}</h2><ul>${entry.changes.map(change=>`<li>${e(change)}</li>`).join("")}</ul></article>`).join("")}</div>`,
    }),
  );
  write(
    "/stats.html",
    shell({
      title: "Directory overview",
      description:
        "Current location coverage for the RivSpotter directory.",
      url: "/stats.html",
      active: "Location data",
      content:
        header(
          "",
          "Location data",
          `Last source refresh ${M.formatDate(latest)}. Counts describe this directory, not Rivian’s total operating footprint.`,
        ) +
        summaryBlock +
        (list.some(p=>p.roamer) ? section("Charging Network Reports", `<p>Location grades, connector details, pricing, and explicit charger issue reports are checked daily. These reports are snapshots, not live availability. The daily refresh checks every active station’s detail page.</p>${list.filter(p=>U.hasReportedIssue(p.roamer?.reportedStatus)).map(p=>`<p><a href="${M.locationUrl(p)}">${e(p.name)}</a> — Reported as ${e(p.roamer.reportedStatus)} · ${M.formatDate(p.roamer.observedAt)}</p>`).join("")}`) : "") +
        section(
          "Location types.",
          list.reduce((types, p) => {
            for(const type of M.locationTypes(p))types[type] = (types[type] || 0) + 1;
            return types;
          }, {}) &&
            Object.entries(
              list.reduce(
                (a, p) => { for(const type of M.locationTypes(p))a[type]=(a[type]||0)+1;return a; },
                {},
              ),
            )
              .map(([t, n]) => `<p><strong>${n}</strong> ${e(U.typeLabel(t))} locations</p>`)
              .join(""),
        ) +
        section(
          "Follow the changes.",
          '<p><a href="/updates.html">See the latest directory updates →</a></p><p><a href="/regions/">Browse all regions →</a></p>',
        ),
    }),
  );
  for (const p of routable) {
    const url = M.locationUrl(p),
      official = M.getOfficialLink(p),
      directions = M.getDirectionsUrl(p),
      booking = M.safeUrl(p.bookingUrl, "rivian.com"),
      description = M.isCharging(p) ? `${p.name}: ${U.locationTypeLabel(p)} charging in ${p.city}, ${regions[p.state] || p.state}. ${M.chargingSummary(p)}. ${p.status === "planned" ? (p.permit ? `${M.permitLabel(p)}. Site reported by ${p.permit.sourceName}; opening date not published.` : "Approximate location; opening date and address not yet published.") : "Address, access and directions."}` : `${p.name} in ${p.city}, ${regions[p.state] || p.state}. Published hours, address, official links and visit information.`,
      nearby = list
        .filter((x) => x.id !== p.id && x.state === p.state && x.country === p.country)
        .sort((a, b) => {
          const da = M.isMapped(p) && M.isMapped(a) ? M.distanceMiles(p, a) : Infinity;
          const db = M.isMapped(p) && M.isMapped(b) ? M.distanceMiles(p, b) : Infinity;
          return da === db ? String(a.id).localeCompare(String(b.id), "en") : da - db;
        })
        .slice(0, 4),
      exceptionText = (p.hoursExceptions || [])
        .map((v) =>
          typeof v === "string"
            ? v
            : v.note ||
              v.raw ||
              v.text ||
              (v.date
                ? `${v.date}: ${v.closed ? "Closed" : v.hours || "Special hours"}`
                : ""),
        )
        .filter(Boolean)
        .join("; ");
    const structured = {
      "@context": "https://schema.org",
      "@type": "Place",
      name: p.name,
      url: BASE + url,
      description,
      address: {
        "@type": "PostalAddress",
        streetAddress: p.displayAddress || p.address,
        addressLocality: p.city,
        addressRegion: p.state,
        addressCountry:
          p.country === "Canada"
            ? "CA"
            : p.country === "United States"
              ? "US"
              : p.country,
      },
      ...(p.phone ? { telephone: p.phone } : {}),
      ...(M.isMapped(p)
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: p.lat,
              longitude: p.lng,
            },
          }
        : {}),
      ...(official?.locationSpecific ? { sameAs: official.url } : {}),
    };
    write(
      url,
      shell({
        title: `${p.name} — ${p.city}, ${p.state}`,
        description,
        url,
        page: "location",
        slug: p.slug,
        structured,
        content: placePage(p, { official, directions, booking, nearby, exceptionText }),
      }),
    );
    for (const alias of p.legacySlugs || []) {
      if (!/^[a-z0-9-]+$/.test(alias) || routable.some(other=>other.slug===alias)) throw Error('Invalid or conflicting location alias');
      const aliasUrl='/locations/'+alias+'/';
      if(routes.includes(aliasUrl))throw Error('Duplicate location alias');
      // Serve the complete current page at the old path, with its canonical URL.
      write(aliasUrl,fs.readFileSync(path.join(dist,url,'index.html'),'utf8'));
    }
  }
  for (const state of states) {
    const name = regions[state] || state,
      items = list
        .filter((p) => p.state === state)
        .sort((a, b) => a.name.localeCompare(b.name));
    write(
      `/regions/${state.toLowerCase()}/`,
      shell({
        title: `Rivian locations in ${name}`,
        description: `Explore ${items.length} Rivian places in ${name}, with official source links and published hours.`,
        url: `/regions/${state.toLowerCase()}/`,
        content:
          header(
            "",
            e(name),
            `${items.length} ${items.length === 1 ? "place" : "places"}. Check each page for current hours, services and official links.`,
          ) +
          `<a class="button" href="/?state=${e(state)}&view=map">${U.icon("map")}Show ${e(name)} on the map</a><section class="content-section card-list">${items.map(p => linkRow(p)).join("")}</section><p><a href="/regions/">Browse all states and provinces</a></p>`,
      }),
    );
  }
  const typeCards = [["RAN", "Rivian Adventure Network", "DC fast charging"], ["Waypoint", "Waypoints", "Level 2 charging"], ["Space", "Spaces", "See the vehicles"], ["Demo Center", "Demo Centers", "Take a demo drive"], ["Service Center", "Service Centers", "Service appointments"], ["Outpost", "Outposts", "Charge and explore"]];
  write(
    "/regions/",
    shell({
      title: "Browse",
      description:
        "Browse Rivian Spaces, Demo Centers, Service Centers, Outposts, Rivian Adventure Network and Waypoint charging by type, state or province.",
      url: "/regions/",
      active: "Browse",
      content:
        header("", "Browse", "") +
        `<section class="browse-section"><h2>Location types</h2><div class="type-grid">${typeCards.map(([type, name, blurb]) => `<a class="type-card" href="/?type=${encodeURIComponent(type)}">${tile(typeIconName[type], typeColor[type])}<strong>${e(name)}</strong><span>${e(blurb)}</span><span class="type-count">${list.filter((p) => M.locationTypes(p).includes(type)).length}</span></a>`).join("")}</div></section>` +
        `<section class="browse-section"><h2>States and provinces</h2><div class="card-list">${states.filter((s) => list.some((p) => p.state === s)).sort((x, y) => (regions[x] || x).localeCompare(regions[y] || y)).map((s) => `<a class="link-row" href="/regions/${s.toLowerCase()}/"><strong>${e(regions[s] || s)}</strong><span class="muted">${list.filter((p) => p.state === s).length}</span>${U.icon("chevron")}</a>`).join("")}</div></section>` +
        `<section class="browse-section"><h2>More</h2><div class="card-list">${[["Location updates", "/updates.html"], ["Location data", "/stats.html"], ["Changelog", "/changelog.html"], ["About", "/about.html"], ["Privacy", "/privacy.html"], ["Report an update", "/contact.html"]].map(([n, h]) => `<a class="link-row" href="${h}"><strong>${n}</strong>${U.icon("chevron")}</a>`).join("")}</div></section>`,
    }),
  );
  const gallery = [...list].sort((a, b) => a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
  write(
    "/locations/",
    shell({
      title: "All Locations",
      description: "Every Rivian Space, Demo Center, Service Center, Outpost, Rivian Adventure Network and Waypoint location in the RivSpotter directory.",
      url: "/locations/",
      active: "Locations",
      page: "gallery",
      content:
        `<header class="page-header gallery-header"><h1>All Locations</h1><p>${gallery.length} places across North America</p></header>` +
        `<div class="gallery-tools" data-gallery-controls hidden><div class="search-field"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><label for="gallery-search" class="sr-only">Find a location</label><input id="gallery-search" type="search" placeholder="Find a location" autocomplete="off"></div><div class="type-chips" role="group" aria-label="Location type"><button type="button" data-gallery-type="" aria-pressed="true">All types</button>${typeCards.map(([type, name]) => `<button type="button" data-gallery-type="${e(type)}" aria-pressed="false"><i class="legend-dot type-fill-${typeColor[type]}"></i>${e(type === "RAN" ? "RAN" : name.replace(/s$/, ""))}</button>`).join("")}</div></div>` +
        `<p id="gallery-count" class="muted gallery-count" role="status" aria-live="polite"></p><div class="gallery-grid" id="gallery">${gallery.map(galleryCard).join("")}</div><p class="notice" id="gallery-empty" hidden>No places match. Try another name, city or state.</p>`,
    }),
  );
  write(
    "/404.html",
    shell({
      title: "Page not found",
      description: "Find your way back to the RivSpotter directory.",
      url: "/404.html",
      content:
        header(
          "",
          "Page not found",
          "This page may have moved, or the address may be incomplete.",
        ) + '<a class="button primary" href="/">Back to the map</a>',
    }),
  );
  fs.writeFileSync(
    path.join(dist, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      [
        "/",
        ...routes.filter(
          (p) => !["/404.html", "/saved.html", "/stats.html"].includes(p),
        ),
      ]
        .map(
          (url) =>
            `<url><loc>${BASE}${url}</loc>${latest ? "<lastmod>" + latest + "</lastmod>" : ""}</url>`,
        )
        .join("") +
      "</urlset>",
  );
  fs.writeFileSync(
    path.join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin-new.html\nSitemap: ${BASE}/sitemap.xml\n`,
  );
  return routes;
}
module.exports = { buildPages, shell };
