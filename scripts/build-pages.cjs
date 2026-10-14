const fs = require("node:fs"),
  path = require("node:path");
const M = require("../js/location-model.js"),
  U = require("../js/components.js"),
  e = M.escapeHtml;
const BASE = "https://rivianspotter.com";
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#244e3c"><title>${e(title)} · Rivian Spotter</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${BASE}${url}"><meta property="og:title" content="${e(title)} · Rivian Spotter"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${BASE}${url}"><link rel="icon" href="/assets/spotter-mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/style.css"><script defer src="/js/components.js"></script>${page ? '<script defer src="/js/location-model.js"></script><script defer src="/js/locations.js"></script><script defer src="/js/charging.js"></script><script defer src="/js/roamer.js"></script><script defer src="/js/app.js"></script>' : ""}${structured ? '<script type="application/ld+json">' + JSON.stringify(structured).replace(/</g, "\\u003c") + "</script>" : ""}<script src="https://tinylytics.app/embed/jj-9YE1ymyozj9wFfy7d.js" defer></script></head><body data-page="${page}"${slug ? ' data-slug="' + e(slug) + '"' : ""}>${U.header(active)}<main id="main" class="page ${page === "location" ? "location-page" : ""}">${content}${U.footer()}</main><div id="toast" class="toast" role="status" hidden></div></body></html>`;
}
function linkRow(p) {
  return `<a class="link-row" href="${M.locationUrl(p)}"><span><strong>${e(p.name)}</strong><br><small>${e(p.type)} · ${e(p.city)}, ${e(p.state)}</small></span>${U.icon("chevron")}</a>`;
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
  const header = (eyebrow, title, body) =>
    `<header class="page-header"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${body}</p></header>`;
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
          "Your personal shortlist",
          "A few places to go.",
          "Save a Space for the weekend, a service location for later, or a charging stop along the way.",
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
          "An independent field guide",
          "Less searching.<br>More getting there.",
          "Rivian Spotter brings Rivian’s places into one useful map, so you can decide where to go and what to expect.",
        ) +
        `<div class="content-grid">${section("A place for every kind of visit.", '<p>Explore Spaces to see the vehicles, find a location offering demo drives, check a service address, or make an Outpost part of a trip.</p><p>Each location page brings together its published address, contact details, hours, and official links. Filters use the capabilities confirmed by Rivian’s sources.</p><p><a href="/regions/">Browse the regional directory →</a></p>')}${section("Built for a useful next step.", "<p>Save a shortlist, share an individual place, and get directions for your next visit. General opening hours and service hours remain separate.</p><p>Rivian Spotter is independently maintained and is not affiliated with or endorsed by Rivian Automotive. Rivian names and trademarks belong to their owners.</p>")}</div><section id="sources" class="content-section"><h2>Information from Rivian.</h2><p>Location information comes from <a href="https://rivian.com/spaces/locations" target="_blank" rel="noopener">Rivian’s official location directory</a>, its location pages, its service-center map, and its <a href="https://rivian.com/experience/charging#map" target="_blank" rel="noopener">charging map</a>. Location pages include official links and the latest source refresh date.</p><p>Opening hours use the destination’s local time zone. Visiting, service, and charging hours are listed separately where published. Service visits and demo drives can be arranged directly with Rivian.</p><p>This directory includes Rivian Adventure Network (RAN) and Waypoint charging locations from Rivian’s public charging map. Charger counts, published maximum power and access are shown on station pages. Map pins come from the official map; directions use the published station address when available. These are station details, not live charger availability. Charging details include pricing, connectors, location grades, and reported issues. Each snapshot has its own capture date. Charging information is refreshed daily. Nearby charging and Rivian places link to each other without merging their services or hours.</p></section>${section("Privacy, in plain language.", '<p>Saved places and theme preferences stay in your browser. “Near me” requests your location only when you tap it; coordinates are used locally to sort places and are not saved by Rivian Spotter. The map provider receives normal map requests for the area you view.</p><p>Maps are provided by Mapbox and its data partners. Their <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener">privacy policy</a> applies to map use. We use Tinylytics for site-usage analytics. We do not add advertising trackers. A service worker stores public pages and location data on your device for faster repeat visits and limited offline access.</p><p>Correction reports open an email draft in your own mail app. Nothing is sent until you send it.</p>')}${section("Help keep the map useful.", '<p>A moved address, new opening, or changed schedule is worth sharing.</p><p><a class="button" href="/contact.html">Report an update</a></p>')}`,
    }),
  );
  write(
    "/contact.html",
    shell({
      title: "Report an update",
      description:
        "Share a new Rivian location, corrected address or updated hours with Rivian Spotter.",
      url: "/contact.html",
      page: "contact",
      content:
        header(
          "Keep the directory useful",
          "Something changed?",
          "Send a correction, suggest a new location, or let us know what could work better.",
        ) +
        `<div class="content-grid"><section><form id="contact-form"><div class="form-field"><label for="contact-location">Location name <span class="muted">(optional)</span></label><input id="contact-location" name="location" maxlength="160" placeholder="e.g. Venice Space"></div><div class="form-field"><label for="contact-kind">What needs updating?</label><select id="contact-kind"><option>Location details</option><option>New location</option><option>Hours or temporary closure</option><option>Map or website issue</option><option>Other feedback</option></select></div><div class="form-field"><label for="contact-message">What should we know?</label><textarea id="contact-message" name="message" required maxlength="5000" placeholder="Tell us what changed and what the correct information should be."></textarea></div><div class="form-field"><label for="contact-source">Official source link <span class="muted">(optional)</span></label><input id="contact-source" type="url" name="source" placeholder="https://rivian.com/…"></div><button class="button primary" type="submit">Prepare email ${U.icon("arrow")}</button><p class="muted" style="font-size:.8rem;margin-top:12px">Opens a draft in your mail app. Review it there before sending.</p><p id="contact-status" class="notice" style="margin-top:20px" role="status" hidden>Your mail app should open with a draft. If it doesn’t, email support@rivianspotter.com directly. This form has not sent a message.</p></form></section><aside class="stack" style="align-content:start"><h2>Every good detail helps.</h2><p class="muted">An official link, complete address, or photo of posted hours can help us update the directory.</p><p class="muted">For vehicle support, service appointments, or booking changes, contact Rivian directly.</p><a href="mailto:support@rivianspotter.com">support@rivianspotter.com</a><a href="https://rivian.com/support" target="_blank" rel="noopener">Rivian support →</a></aside></div>`,
    }),
  );
  const summaryBlock = `<div class="stat-strip"><div><strong>${list.length}</strong><span>Places in the directory</span></div><div><strong>${states.length}</strong><span>States & provinces</span></div><div><strong>${additions.length}</strong><span>Places added this refresh</span></div></div>`;
  write(
    "/updates.html",
    shell({
      title: "Site updates",
      description: "New features, improvements, and fixes to Rivian Spotter.",
      url: "/updates.html",
      active: "Updates",
      content: header("Site changelog", "What’s new.", "New features, improvements, and fixes to Rivian Spotter.") +
        `<div class="changelog">${require("../data/site-changelog.json").map(entry=>`<article class="changelog-entry"><div class="changelog-meta">${entry.date ? `<time datetime="${e(entry.date)}">${M.formatDate(entry.date)}</time>` : ""}<span class="tag">${e(entry.version)}</span></div><h2>${e(entry.title)}</h2><ul>${entry.changes.map(change=>`<li>${e(change)}</li>`).join("")}</ul></article>`).join("")}</div>`,
    }),
  );
  write(
    "/stats.html",
    shell({
      title: "Directory overview",
      description:
        "Current location coverage for the Rivian Spotter directory.",
      url: "/stats.html",
      active: "Updates",
      content:
        header(
          "Coverage, with context",
          "The directory at a glance.",
          `Last source refresh ${M.formatDate(latest)}. Counts describe this directory, not Rivian’s total operating footprint.`,
        ) +
        summaryBlock +
        (list.some(p=>p.roamer) ? section("Charging Network Reports", `<p>Location grades, connector details, pricing, and explicit charger issue reports are checked daily. These reports are snapshots, not live availability. Detailed charger pages are refreshed in a small rotating batch.</p>${list.filter(p=>U.hasReportedIssue(p.roamer?.reportedStatus)).map(p=>`<p><a href="${M.locationUrl(p)}">${e(p.name)}</a> — Reported as ${e(p.roamer.reportedStatus)} · ${M.formatDate(p.roamer.observedAt)}</p>`).join("")}`) : "") +
        section(
          "Location types.",
          list.reduce((types, p) => {
            types[p.type] = (types[p.type] || 0) + 1;
            return types;
          }, {}) &&
            Object.entries(
              list.reduce(
                (a, p) => ({ ...a, [p.type]: (a[p.type] || 0) + 1 }),
                {},
              ),
            )
              .map(([t, n]) => `<p><strong>${n}</strong> ${e(t)} locations</p>`)
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
      description = M.isCharging(p) ? `${p.name}: ${p.network} charging in ${p.city}, ${regions[p.state] || p.state}. ${M.chargingSummary(p)}. Address, access and directions.` : `${p.name} in ${p.city}, ${regions[p.state] || p.state}. Published hours, address, official links and visit information.`,
      nearby = list
        .filter((x) => x.id !== p.id && x.state === p.state)
        .sort((a, b) => M.distanceMiles(p, a) - M.distanceMiles(p, b))
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
        content: `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Explore</a><span>/</span><a href="/regions/${p.state.toLowerCase()}/">${e(regions[p.state] || p.state)}</a></nav><header class="page-header"><p class="eyebrow">${e(p.type)}</p><div class="location-title"><h1>${e(p.name)}</h1>${U.gradeBadge(p.roamer)}</div><address>${e(p.displayAddress || p.address || "Street address not listed")}<br>${e(p.city)}, ${e(p.state)} ${e(p.postalCode || "")} · ${p.country === "CA" ? "Canada" : p.country === "US" ? "United States" : e(p.country)}</address></header><div class="actions">${directions ? `<a class="button primary" href="${e(directions)}" target="_blank" rel="noopener">${U.icon("arrow")}Directions</a>` : ""}<a class="button" href="/?location=${e(p.slug)}&view=map">${U.icon("map")}${M.isMapped(p) ? "Show on Map" : "View in explorer"}</a>${booking ? `<a class="button" href="${e(booking)}" target="_blank" rel="noopener">Book a Demo Drive ${U.icon("external")}</a>` : ""}</div><div class="utility-actions"><button class="button" type="button" data-save="${p.id}" aria-pressed="false">${U.icon("save")}Save</button><button class="button" type="button" data-share="${p.id}">${U.icon("share")}Share</button><a class="button" href="/contact.html?location=${e(p.slug)}">Report an update</a></div><div class="content-grid"><section class="content-section"><h2>Plan your visit.</h2>${p.status === "planned" ? '<p class="notice">Coming soon.</p>' : ""}${p.status === "temporarily-closed" ? '<p class="notice">Temporarily closed. Check the official page for reopening information.</p>' : ""}${M.isCharging(p) ? U.chargingDetails(p) : `<h3 style="margin:24px 0 12px">Visiting hours</h3><p class="hours-text">${e(p.hours || "Visiting hours not listed.")}</p>${p.serviceHours ? `<h3 style="margin:24px 0 12px">Service hours</h3><p class="hours-text">${e(p.serviceHours)}</p>` : ""}${p.serviceStatus === "planned" ? '<p class="notice warning" style="margin-top:20px">Service coming soon. The visiting hours above remain separate.</p>' : ""}${p.chargingHours ? `<h3 style="margin:24px 0 12px">Charging hours</h3><p class="hours-text">${e(p.chargingHours)}</p>` : ""}${exceptionText ? `<p class="notice warning" style="margin-top:20px">Published schedule note: ${e(exceptionText)}. Check the official page for current exceptions.</p>` : ""}${p.timezone ? `<p style="font-size:.8rem;margin-top:16px">Times are local to ${e(p.timezone.replaceAll("_", " "))}.</p>` : ""}${(p.services || []).length ? `<h3 style="margin:32px 0 12px">At this location</h3><div class="actions">${p.services.map((s) => `<span class="tag">${e(s)}</span>`).join("")}</div>` : ""}${p.phone ? `<p style="margin-top:24px"><a href="tel:${e(p.phone.replace(/[^+\d]/g, ""))}">${e(p.phone)}</a></p>` : ""}${U.relatedPlaces(p.chargingStations, "Charging Nearby")}`}</section><aside class="content-section"><h2>Know before you go.</h2>${p.lastVerified ? `<p class="source-date">Updated from Rivian · ${M.formatDate(p.lastVerified)}</p>` : ""}<p style="margin-top:20px">${M.isCharging(p) ? "Charger count and maximum power are published station details. Hours, pricing and connector availability can vary by site." : p.type === "Service Center" ? "Service visits may require an appointment. Confirm availability directly with Rivian." : "Demo-drive availability and vehicle displays can vary. Use the official page to check before making a special trip."}</p>${official ? `<p><a class="button" href="${e(official.url)}" target="_blank" rel="noopener">${e(official.label)} ${U.icon("external")}</a></p>` : ""}<p style="font-size:.8rem"><a href="/about.html#sources">About our sources</a></p></aside></div>${nearby.length ? section("More places in " + e(regions[p.state] || p.state) + ".", nearby.map(linkRow).join("")) : ""}`,
      }),
    );
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
            "Explore by region",
            `Rivian in ${e(name)}.`,
            `${items.length} places to explore. Check individual pages for current hours, services and official links.`,
          ) +
          `<a class="button" href="/?state=${e(state)}&view=map">${U.icon("map")}Explore ${e(name)} on the map</a><section class="content-section">${items.map(linkRow).join("")}</section><a href="/regions/">All regions →</a>`,
      }),
    );
  }
  write(
    "/regions/",
    shell({
      title: "Browse by region",
      description:
        "Find Rivian Spaces, Demo Centers, Service Centers, Outposts, RAN and Waypoint charging by state or province.",
      url: "/regions/",
      content:
        header(
          "Choose your starting point",
          "A little closer to home.",
          "Browse every location in the directory by state or province.",
        ) +
        `<div class="content-section">${states.map((s) => `<a class="link-row" href="/regions/${s.toLowerCase()}/"><strong>${e(regions[s] || s)}</strong><span class="muted">${list.filter((p) => p.state === s).length} places →</span></a>`).join("")}</div>`,
    }),
  );
  write(
    "/404.html",
    shell({
      title: "Page not found",
      description: "Find your way back to the Rivian Spotter directory.",
      url: "/404.html",
      content:
        header(
          "A wrong turn",
          "Let’s get you back on the map.",
          "This page may have moved, or the address may be incomplete.",
        ) + '<a class="button primary" href="/">Explore locations</a>',
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
