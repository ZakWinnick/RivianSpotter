(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.SpotterUI = api;
    api.mount();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const paths = {
    search: "M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    arrow: "m5 12 14-7-7 14-1-6-6-1Z",
    close: "m6 6 12 12M18 6 6 18",
    chevron: "m9 5 7 7-7 7",
    save: "M6 3h12v18l-6-4-6 4V3Z",
    share: "M12 16V2m-5 5 5-5 5 5M5 12H3v10h18V12h-2",
    sun: "M12 3V1m0 22v-2M3 12H1m22 0h-2M5 5 3 3m18 18-2-2M5 19l-2 2M21 3l-2 2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
    filter: "M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6m-8 0v6",
    space: "M4 21V8l8-5 8 5v13M1 21h22M9 21v-7h6v7M8 9h1m6 0h1",
    drive: "m3 11 2-6h14l2 6M2 11h20v8H2v-8Zm3 8v3m14-3v3M5 14h3m8 0h3",
    service: "m14 3-3 4 2 4 4 2 4-3a7 7 0 0 1-9 9L5 23l-4-4 7-7a7 7 0 0 1 6-9Z",
    outpost: "m2 21 10-18 10 18H2Zm6 0 4-7 4 7",
    bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
    plug: "M8 2v5m8-5v5M6 7h12v4a6 6 0 0 1-12 0V7Zm6 10v5",
    check: "m4 12 5 5L20 6",
    clock: "M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    map: "m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Zm6-3v17m8-14v17",
    list: "M8 5h14M8 12h14M8 19h14M2 5h1m-1 7h1m-1 7h1",
    external: "M14 2h8v8m0-8L10 14M10 3H2v19h19v-9",
  };
  function icon(name, cls = "") {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.pin}"/></svg>`;
  }
  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function relatedPlaces(items, heading) {
    if (!items?.length) return "";
    return `<section class="related-places"><h3>${heading}</h3>${items.map(p=>`<a class="link-row" href="/locations/${encodeURIComponent(p.slug)}/"><span><strong>${escape(p.name)}</strong><br><small>${escape(p.type)}${p.chargerCount != null ? ` · ${p.chargerCount} ${p.chargerCount===1?'charger':'chargers'}` : ''}</small></span>${icon('chevron')}</a>`).join('')}</section>`;
  }
  function hasReportedIssue(status) {
    return /^(?:inoperable|offline|out of service|maintenance|under maintenance|unavailable|downtime|outage|temporarily closed)$/i.test(status || "");
  }
  function roamerDetails(r) {
    if(!r || !/^https:\/\/rivianroamer\.com\/charging\/sites\/US-RIV-L\d+$/.test(r.sourceUrl||"")) return "";
    const date = value=>new Date(value).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
    const observed = date(r.observedAt), detailsDate=r.detailsObservedAt?date(r.detailsObservedAt):null;
    const issue = hasReportedIssue(r.reportedStatus);
    const rates = Object.entries(r.rates||{}).map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}<small>/kWh</small></dd></div>`).join("");
    const ports = (r.chargers||[]).map(p=>`<tr><td>${escape(p.name)}</td><td>${escape(p.connector)}</td><td>${p.powerKw?escape(p.powerKw)+" kW":"—"}</td><td>${(p.features||[]).map(f=>`<span title="${escape(f.description)}">${escape(f.label)}</span>`).join(" · ")}</td></tr>`).join("");
    return `<section class="roamer-details"><h3>Charging Details${r.reliabilityGrade?`<span class="roamer-grade">Roamer Grade ${escape(r.reliabilityGrade)}</span>`:""}</h3><p class="charging-note">Snapshot from <a href="${escape(r.sourceUrl)}" target="_blank" rel="noopener">Rivian Roamer</a> · ${observed}</p>${issue?`<p class="notice warning"><strong>Reported Charger Issue</strong><br>Roamer reported “${escape(r.reportedStatus)}” on ${observed}. This is a daily snapshot.</p>`:""}${r.connectorSummary?`<div class="charging-tags"><span class="tag">${escape(r.connectorSummary)}</span></div>`:""}${rates?`<h4>Pricing per kWh</h4><dl class="charging-prices">${rates}</dl><p class="charging-note">Prices may vary by time or vehicle. Confirm the rate before charging.</p>`:""}${r.averagePeakKw?`<p class="power-observation"><strong>${escape(r.averagePeakKw)} kW</strong> average peak charging power reported by Roamer. Rated maximum power is listed separately above.</p>`:""}${r.hours?`<p><strong>Charging Hours:</strong> ${escape(r.hours)}</p>`:""}${r.detailRates?.Idle?`<p><strong>Idle Fee:</strong> ${escape(r.detailRates.Idle)}</p>`:""}${r.amenities?.length?`<div class="charging-tags">${r.amenities.map(a=>`<span class="tag">${escape(a)}</span>`).join("")}</div>`:""}${ports?`<details class="charger-table"><summary>Individual Chargers (${r.chargers.length})</summary><div class="table-scroll"><table><thead><tr><th>Port</th><th>Connector</th><th>Rated Power</th><th>Features</th></tr></thead><tbody>${ports}</tbody></table></div></details>`:""}${detailsDate?`<p class="charging-note">Hours, amenities, idle fees, and individual charger details captured ${detailsDate}.</p>`:""}</section>`;
  }
  function chargingDetails(p) {
    const access=p.rivianOnly===true?'Rivian Vehicles Only':p.rivianOnly===false?'Open to Other EVs':'Access Not Listed';
    return `${p.listed===false?'<p class="notice">This station is no longer listed on Rivian’s current charging map.</p>':''}<div class="charging-facts"><div><strong>${p.chargerCount == null ? '—' : escape(p.chargerCount)}</strong><span>${p.chargerCount===1?'Charger':'Chargers'}</span></div><div><strong>${p.maxKw>0?escape(p.maxKw)+' <small>kW</small>':'—'}</strong><span>Maximum Power</span></div></div><div class="charging-tags"><span class="tag">${p.type==='RAN'?'DC Fast Charging':'Level 2 Charging'}</span><span class="tag">${access}</span></div><p class="charging-note">Station details, not live charger availability. Charging speed depends on the vehicle and conditions. Check connector compatibility and any host access rules before your visit.</p>${roamerDetails(p.roamer)}${relatedPlaces(p.nearbyPlaces,'Nearby Rivian Places')}`;
  }
  function header(active = "") {
    return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="Rivian Spotter home"><img src="/assets/spotter-mark.svg" width="28" height="34" alt=""><span>RIVIAN <span class="brand-light">SPOTTER</span></span></a><nav aria-label="Main navigation">${[
      ["Explore", "/"],
      ["Saved", "/saved.html"],
      ["Updates", "/updates.html"],
      ["About", "/about.html"],
    ]
      .map(
        ([n, h]) =>
          `<a href="${h}"${active === n ? ' aria-current="page"' : ""}>${n}</a>`,
      )
      .join(
        "",
      )}</nav><button class="icon-button theme-toggle" type="button" aria-label="Switch to dark theme">${icon("sun")}</button></header>`;
  }
  function footer() {
    return `<footer class="site-footer"><span>Independent. Community maintained.</span><span><a href="/contact.html">Report an update</a><a href="/about.html#sources">Sources & privacy</a></span></footer>`;
  }
  function mount() {
    const h = document.querySelector("[data-site-header]");
    if (h && !h.children.length) h.innerHTML = header(h.dataset.active || "");
    const f = document.querySelector("[data-site-footer]");
    if (f && !f.children.length) f.innerHTML = footer();
    let theme;
    try {
      theme = localStorage.getItem("spotter-theme");
    } catch {}
    const media = matchMedia("(prefers-color-scheme: dark)");
    function apply(value) {
      document.documentElement.dataset.theme = value;
      document.querySelectorAll(".theme-toggle").forEach((b) => {
        b.setAttribute(
          "aria-label",
          `Switch to ${value === "dark" ? "light" : "dark"} theme`,
        );
        b.setAttribute("aria-pressed", String(value === "dark"));
      });
      document.dispatchEvent(new CustomEvent("themechange", { detail: value }));
    }
    apply(theme || (media.matches ? "dark" : "light"));
    document.querySelectorAll(".theme-toggle").forEach((b) =>
      b.addEventListener("click", () => {
        theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("spotter-theme", theme);
        } catch {}
        apply(theme);
      }),
    );
    media.addEventListener("change", (e) => {
      if (!theme) apply(e.matches ? "dark" : "light");
    });
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker
        .register("/service-worker.js", { updateViaCache: "none" })
        .catch(() => {});
  }
  return { header, footer, icon, mount, chargingDetails, roamerDetails, hasReportedIssue, relatedPlaces };
});
