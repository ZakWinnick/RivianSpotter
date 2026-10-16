/* Public explorer and portable, on-device saved places. No account required. */
(() => {
  "use strict";
  const M = LocationModel,
    U = SpotterUI,
    e = M.escapeHtml,
    $ = (id) => document.getElementById(id),
    page = document.body.dataset.page;
  let all = [],
    filtered = [],
    selected = null,
    origin = null,
    area = null,
    view = "list",
    detailReturnView = "list",
    mode = "all",
    saveIds = [],
    timer,
    lastTrigger = null;
  try {
    const v = JSON.parse(
      localStorage.getItem("rivian-spotter-saved") ||
        localStorage.getItem("rivian_favorites") ||
        localStorage.getItem("rivianFavorites") ||
        "[]",
    );
    if (Array.isArray(v))
      saveIds = v
        .map((x) => (typeof x === "object" ? x.id : x))
        .map(Number)
        .filter(Number.isFinite);
  } catch {}
  function toast(text) {
    if (!$("toast")) {
      const el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    clearTimeout(timer);
    $("toast").textContent = text;
    $("toast").hidden = false;
    timer = setTimeout(() => ($("toast").hidden = true), 5000);
  }
  function persist() {
    try {
      localStorage.setItem("rivian-spotter-saved", JSON.stringify(saveIds));
      return true;
    } catch {
      toast("Saved for this visit. Browser storage is unavailable.");
      return false;
    }
  }
  function typeIcon(p) {
    return `<span class="type-icon${p.status === "planned" ? " type-planned" : ""} type-${e(p.type.toLowerCase().replaceAll(" ", "-"))}">${U.icon({ Space: "space", "Demo Center": "drive", "Service Center": "service", Outpost: "outpost", RAN: "bolt", Waypoint: "plug" }[p.type])}</span>`;
  }
  function find(id) {
    return all.find(
      (p) =>
        p.id === Number(id) ||
        (p.legacyIds || []).includes(Number(id)) ||
        p.slug === id,
    );
  }
  function normalizeSaved() {
    saveIds = [...new Set(saveIds.map((id) => find(id)?.id || id))];
  }
  function toggleSave(id) {
    id = Number(id);
    const had = saveIds.includes(id);
    saveIds = had ? saveIds.filter((x) => x !== id) : [...saveIds, id];
    if (persist())
      toast(had ? "Removed from saved places." : "Place saved on this device.");
    document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(!had));
      b.innerHTML = U.icon("save") + (had ? "Save" : "Saved");
    });
    if (page === "saved") renderSaved();
    else if ($("saved-filter")?.checked) render();
  }
  function params() {
    return new URLSearchParams(location.search);
  }
  function filters() {
    return {
      query: $("search").value,
      mode,
      type: $("type-filter").value,
      intent: $("intent-filter").value,
      state: $("state-filter").value,
      openNow: $("open-filter").checked,
      savedOnly: $("saved-filter").checked,
      savedIds: saveIds,
    };
  }
  function writeUrl(push = false) {
    if (page !== "explore") return;
    const f = filters(),
      p = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: f.query,
      mode: mode === "all" ? "" : mode,
      type: f.type,
      intent: f.intent,
      state: f.state,
      open: f.openNow ? "1" : "",
      saved: f.savedOnly ? "1" : "",
      sort: $("sort-filter").value === "name" ? "" : $("sort-filter").value,
      location: selected?.slug || "",
      view: (selected ? detailReturnView : view) === "map" ? "map" : "",
      bounds: area?.map((x) => x.toFixed(5)).join(",") || "",
    }))
      if (value) p.set(key, value);
    const url = "/" + (p.size ? "?" + p : "");
    history[push ? "pushState" : "replaceState"]({}, "", url);
  }
  function readUrl() {
    const p = params();
    for (const [id, key] of [
      ["search", "q"],
      ["type-filter", "type"],
      ["intent-filter", "intent"],
      ["state-filter", "state"],
      ["sort-filter", "sort"],
    ]) {
      if (p.has(key)) $(id).value = p.get(key);
      else $(id).value = id === "sort-filter" ? "name" : "";
    }
    if (
      !$("sort-filter").value ||
      ($("sort-filter").value === "nearest" && !origin)
    )
      $("sort-filter").value = "name";
    $("open-filter").checked = p.get("open") === "1";
    $("saved-filter").checked = p.get("saved") === "1";
    mode = ["charge", "visit"].includes(p.get("mode")) ? p.get("mode") : p.has("type") ? (["RAN","Waypoint"].includes(p.get("type")) ? "charge" : "visit") : "all";
    const b = (p.get("bounds") || "").split(",").map(Number);
    area =
      b.length === 4 && b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3]
        ? b
        : null;
    view = p.get("view") === "map" ? "map" : "list";
    setView(view, false);
    const extra = ["intent", "state", "open", "saved"].some((k) => p.has(k));
    $("extra-filters").hidden = !extra;
    $("filter-toggle").setAttribute("aria-expanded", String(extra));
    return p.get("location") || p.get("id");
  }
  function row(p, saved = false) {
    const h = M.getHoursState(
        p,
        new Date(),
        ["service","charging"].includes($("intent-filter")?.value) ? $("intent-filter").value : "general",
      ),
      dist =
        origin && M.coordinates(p)
          ? `${Math.round(M.distanceMiles(origin, p))} mi · `
          : "";
    return `<article class="location-row${selected?.id === p.id ? " selected" : ""}" data-location="${p.id}">${saved ? `<a class="location-select" href="${M.locationUrl(p)}">` : `<button type="button" class="location-select" data-select="${p.id}" aria-label="View ${e(p.name)}, ${e(p.city)}, ${e(p.state)}" aria-pressed="${selected?.id === p.id}">`}${typeIcon(p)}<span class="row-text"><span class="row-name">${e(p.name)}</span><span class="row-meta">${e(U.typeLabel(p.type))} · ${e(p.city)}, ${e(p.state)}</span><span class="status ${h.state}">${dist}${e(M.isCharging(p) ? M.chargingSummary(p) : h.label)}</span>${p.roamer?.connectorSummary ? `<span class="row-meta">${e(p.roamer.connectorSummary)}</span>` : ""}</span>${U.locationGrade(p, true) || U.icon("chevron", "row-arrow")}${saved ? "</a>" : "</button>"}${saved ? `<button class="icon-button remove-save" type="button" data-remove="${p.id}" aria-label="Remove ${e(p.name)} from saved places">${U.icon("close")}</button>` : ""}</article>`;
  }
  const categories = {
    RAN: {name:"Rivian Adventure Network",short:"Rivian Adventure Network",description:"DC fast charging"},
    Waypoint: {name:"Waypoints",short:"Waypoint",description:"Level 2 charging"},
    Space: {name:"Spaces",short:"Space",description:"Meet Rivian"},
    "Demo Center": {name:"Demo Centers",short:"Demo",description:"Get behind the wheel"},
    "Service Center": {name:"Service Centers",short:"Service",description:"Care for your vehicle"},
    Outpost: {name:"Outposts",short:"Outpost",description:"Recharge and explore"}
  };
  function browseChrome() {
    document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===mode)));
    const types = Object.keys(categories).filter(t=>mode==="all" || (mode==="charge") === ["RAN","Waypoint"].includes(t));
    const chips = mode === "all" ? "" : `<button type="button" data-type="" aria-pressed="${!$("type-filter").value}">All</button>` + types.map(t=>`<button type="button" data-type="${e(t)}" aria-pressed="${$("type-filter").value===t}">${e(categories[t].short)}</button>`).join("");
    if ($("type-chips").innerHTML !== chips) $("type-chips").innerHTML = chips;
    const f=filters();
    const overview = mode==="all" && !f.query.trim() && !f.type && !f.intent && !f.state && !f.openNow && !f.savedOnly && !area && !origin;
    $("browse-overview").hidden = !overview;
    $("result-heading").hidden = overview;
    $("results").hidden = overview;
    if(overview){
      const active=all.filter(p=>p.listed!==false);
      const cards=keys=>keys.map(type=>`<button class="category-card" type="button" data-category="${e(type)}">${typeIcon({type})}<span class="category-count">${active.filter(p=>p.type===type).length}</span><strong>${e(categories[type].name)}</strong><small>${e(categories[type].description)}</small></button>`).join("");
      $("browse-overview").innerHTML=`<div class="category-heading"><h2>Charging</h2><span>${active.filter(M.isCharging).length} locations</span></div><div class="category-grid">${cards(["RAN","Waypoint"])}</div><div class="category-heading"><h2>Rivian Places</h2><span>${active.filter(p=>!M.isCharging(p)).length} locations</span></div><div class="category-grid">${cards(["Space","Demo Center","Service Center","Outpost"])}</div>`;
    }
  }
  function chooseMode(next,type="") {
    if(selected) closeDetail(false);
    mode=next; $("type-filter").value=type;
    $("intent-filter").value=""; $("open-filter").checked=false; area=null;
    render(); SpotterMap.resetOverview();
  }
  function render(fit = false) {
    const f = filters();
    filtered = M.filterLocations(all, f);
    if (area)
      filtered = filtered.filter(
        (p) =>
          M.coordinates(p) &&
          p.lng >= area[0] &&
          p.lat >= area[1] &&
          p.lng <= area[2] &&
          p.lat <= area[3],
      );
    const sort = $("sort-filter").value;
    filtered.sort(
      sort === "nearest" && origin
        ? (a, b) => M.distanceMiles(origin, a) - M.distanceMiles(origin, b)
        : sort === "recent"
          ? (a, b) =>
              (b.lastVerified || "").localeCompare(a.lastVerified || "") ||
              a.name.localeCompare(b.name)
          : (a, b) => a.name.localeCompare(b.name),
    );
    $("result-count").textContent =
      `${filtered.length} ${filtered.length === 1 ? "location" : "locations"}`;
    $("results").innerHTML = filtered.length
      ? filtered.map((p) => row(p)).join("")
      : `<div class="empty">${U.icon("search")}<h2>No places found.</h2><p>Try another city or region, or clear your filters to see more locations.</p><button class="button" data-reset type="button">Clear filters</button></div>`;
    const count = [f.intent, f.state, f.openNow, f.savedOnly, area].filter(
      Boolean,
    ).length;
    $("filter-count").textContent = count ? `(${count})` : "";
    $("clear-area").hidden = !area;
    const mapped = filtered.filter(
      (p) => M.isMapped(p),
    ).length;
    $("map-caption").textContent =
      `${mapped} mapped ${mapped === 1 ? "place" : "places"}`;
    SpotterMap.update(filtered, fit);
    if (selected && !filtered.some((p) => p.id === selected.id))
      closeDetail(false);
    browseChrome();
    writeUrl();
  }
  function sourceDate(p) {
    return p.lastVerified ? `<div class="source-date"><span>Updated from Rivian · ${M.formatDate(p.lastVerified)}</span></div>` : "";
  }
  function detail(p) {
    const official = M.getOfficialLink(p),
      booking = M.safeUrl(p.bookingUrl, "rivian.com"),
      directions = M.getDirectionsUrl(p),
      h = M.getHoursState(p),
      phone = String(p.phone || "").replace(/[^+\d]/g, "");
    return `<div class="detail-top"><span class="category">${typeIcon(p)}${e(U.typeLabel(p.type))}</span><button id="close-detail" class="icon-button" type="button" aria-label="Close location details">${U.icon("close")}</button></div><div class="location-title"><h2 id="detail-title" tabindex="-1"><a href="${e(M.locationUrl(p))}">${e(p.name)}</a></h2>${U.locationGrade(p)}</div><address>${e(p.displayAddress || p.address || "Street address not listed")}<br>${e(p.city)}, ${e(p.state)} ${e(p.postalCode || "")}${p.country ? " · " + e(p.country === "US" ? "United States" : p.country === "CA" ? "Canada" : p.country) : ""}</address>${sourceDate(p)}<div class="detail-actions">${directions ? `<a class="button primary" href="${e(directions)}" target="_blank" rel="noopener">${U.icon("arrow")}Directions</a>` : ""}${booking ? `<a class="button${directions ? "" : " primary"}" href="${e(booking)}" target="_blank" rel="noopener">Book a Demo Drive ${U.icon("external")}</a>` : ""}${official ? `<a class="button" href="${e(official.url)}" target="_blank" rel="noopener">${e(official.label)} ${U.icon("external")}</a>` : ""}${phone ? `<a class="button" href="tel:${e(phone)}">Call ${e(p.phone)}</a>` : ""}</div>${M.isCharging(p) ? `<div class="detail-section">${U.chargingDetails(p)}</div>` : `<div class="detail-section"><h3>${U.icon("clock")} ${p.type === "Service Center" ? "Service hours" : "Visiting hours"} <span class="status ${h.state}">${e(h.label)}</span></h3><p class="hours-text">${e((p.type === "Service Center" ? p.serviceHours : p.hours) || "Hours not listed.")}</p>${p.serviceHours && p.type !== "Service Center" ? `<h3 style="margin-top:16px">Service hours</h3><p class="hours-text">${e(p.serviceHours)}</p>` : ""}${p.serviceStatus === "planned" ? '<p class="notice warning" style="margin-top:12px">Service coming soon. Visiting and demo-drive hours are listed above.</p>' : ""}${p.chargingHours ? `<h3 style="margin-top:16px">Charging hours</h3><p class="hours-text">${e(p.chargingHours)}</p>` : ""}${p.timezone ? `<p class="muted" style="font-size:.7rem;margin-top:10px">Local time · ${e(p.timezone.replaceAll("_", " "))}</p>` : ""}</div>${U.relatedPlaces(p.chargingStations, "Charging Nearby")}`}<div class="utility-actions"><button class="button" type="button" data-save="${p.id}" aria-pressed="${saveIds.includes(p.id)}">${U.icon("save")}${saveIds.includes(p.id) ? "Saved" : "Save"}</button><button class="button" type="button" data-share="${p.id}">${U.icon("share")}Share</button><a class="button" href="/contact.html?location=${encodeURIComponent(p.slug)}">Report update</a></div><a class="detail-link" href="${M.locationUrl(p)}">Full location details →</a>`;
  }
  function select(id, { focus = true, push = true } = {}) {
    const p = find(id);
    if (!p) {
      toast("That location could not be found. Try searching by name.");
      return;
    }
    if (!selected) {
      detailReturnView = view;
      lastTrigger = document.activeElement;
    }
    selected = p;
    $("detail").innerHTML = detail(p);
    $("detail").hidden = false;
    $("detail").scrollTop = 0;
    browseChrome();
    if(innerWidth <= 760) setView("map", false);
    document.querySelectorAll(".location-row").forEach((el) => {
      const yes = Number(el.dataset.location) === p.id;
      el.classList.toggle("selected", yes);
      el.querySelector("button")?.setAttribute("aria-pressed", String(yes));
    });
    SpotterMap.focus(p);
    writeUrl(push);
    if (focus) $("detail-title").focus({ preventScroll: true });
  }
  function closeDetail(write = true) {
    const returnView = selected ? detailReturnView : view;
    selected = null;
    SpotterMap.clearFocus();
    $("detail").hidden = true;
    setView(returnView, false);
    browseChrome();
    document.querySelectorAll(".location-row.selected").forEach((el) => {
      el.classList.remove("selected");
      el.querySelector("button")?.setAttribute("aria-pressed", "false");
    });
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    if (write) writeUrl();
  }
  function setView(next, write = true) {
    view = next;
    $("main").dataset.view = view;
    $("map-mode").setAttribute("aria-pressed", String(view === "map"));
    $("list-mode").setAttribute("aria-pressed", String(view === "list"));
    requestAnimationFrame(() => SpotterMap.resize());
    if (write) writeUrl();
  }
  function reset() {
    mode = "all";
    if(selected) closeDetail(false);
    for (const id of ["search", "type-filter", "intent-filter", "state-filter"])
      $(id).value = "";
    $("open-filter").checked = false;
    $("saved-filter").checked = false;
    area = null;
    render(true);
  }
  function near() {
    if (!navigator.geolocation) {
      toast(
        "Location is unavailable in this browser. Search by city or region instead.",
      );
      return;
    }
    const b = $("near-me");
    b.disabled = true;
    b.setAttribute("aria-label", "Locating…");
    b.setAttribute("aria-busy", "true");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        b.disabled = false;
        b.setAttribute("aria-label", "Locate me");
        b.setAttribute("aria-busy", "false");
        $("sort-filter").querySelector("[value=nearest]").disabled = false;
        $("sort-filter").value = "nearest";
        area = null;
        render();
        const nearest = filtered.find(
          (p) => M.isMapped(p),
        );
        if (nearest) SpotterMap.focus(nearest);
        toast("Sorted by distance from your location.");
      },
      (err) => {
        b.disabled = false;
        b.setAttribute("aria-label", "Locate me");
        b.setAttribute("aria-busy", "false");
        toast(
          err.code === 1
            ? "Location access was declined. Search by city or region instead."
            : "Your location couldn’t be found. Search by city or region instead.",
        );
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  }
  async function share(id) {
    const p = find(id);
    if (!p) return;
    const url = "https://rivianspotter.com" + M.locationUrl(p);
    try {
      if (navigator.share)
        await navigator.share({ title: p.name + " · Rivian Spotter", url });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast("Location link copied.");
      } else {
        toast(
          "Open full location details to copy the address from your browser.",
        );
      }
    } catch (err) {
      if (err.name !== "AbortError")
        toast(
          "Sharing is unavailable. Open full location details to copy its link.",
        );
    }
  }
  function renderSaved() {
    const saved = all.filter((p) => saveIds.includes(p.id));
    $("saved-count").textContent =
      `${saved.length} ${saved.length === 1 ? "place" : "places"} saved on this device`;
    $("saved-results").innerHTML = saved.length
      ? saved.map((p) => row(p, true)).join("")
      : `<div class="empty">${U.icon("save")}<h2>Your next stops belong here.</h2><p>Save a location while exploring, then come back when you’re ready to go.</p><a class="button primary" href="/">Explore locations</a></div>`;
  }
  function contact() {
    const slug = params().get("location"),
      loc = all.find((p) => p.slug === slug);
    if (loc)
      $("contact-location").value =
        loc.name + " — " + loc.city + ", " + loc.state;
    $("contact-form")?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = $("contact-location").value,
        kind = $("contact-kind").value,
        body = $("contact-message").value;
      location.href =
        "mailto:support@rivianspotter.com?subject=" +
        encodeURIComponent(`[Location update] ${name || kind}`) +
        "&body=" +
        encodeURIComponent(
          `Location: ${name || "Not specified"}\nUpdate type: ${kind}\n\n${body}\n\nOfficial source URL: ${$("contact-source").value || "Not provided"}`,
        );
      $("contact-status").hidden = false;
    });
  }
  async function load() {
    try {
      const response = await fetch("/data/locations.json", {
        cache: "no-cache",
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      all = Array.isArray(data) ? data : data.locations || [];
      if (!all.length) throw Error();
    } catch {
      all =
        typeof rivianLocations !== "undefined"
          ? rivianLocations
          : window.rivianLocations || [];
      if (!all.length) {
        if ($("results"))
          $("results").innerHTML =
            '<div class="empty"><h2>Locations couldn’t load.</h2><p>Check your connection and try again.</p><button class="button" data-reload>Try again</button></div>';
        return;
      }
      toast(
        "Showing the bundled location directory. Live refresh is unavailable.",
      );
    }
    let chargers = typeof rivianChargingLocations !== "undefined" ? rivianChargingLocations : [];
    try {
      const response = await fetch("/data/charging.json", {cache:"no-cache"});
      if (!response.ok) throw Error("Charging directory unavailable");
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw Error("Empty charging directory");
      chargers = data;
    } catch { /* Use the release's bundled charging snapshot when offline. */ }
    let roamer = typeof rivianRoamerSnapshot !== "undefined" ? rivianRoamerSnapshot.stations : [];
    try { const response=await fetch("/data/roamer.json",{cache:"no-cache"}); if(response.ok){const snapshot=await response.json();if(Array.isArray(snapshot.stations))roamer=snapshot.stations;} } catch { /* Use the bundled snapshot when offline. */ }
    all = M.combineLocations(all, chargers, roamer);
    normalizeSaved();
    if (page === "explore") {
      $("state-filter").innerHTML =
        '<option value="">All regions</option>' +
        [...new Set(all.map((p) => p.state))]
          .filter(Boolean)
          .sort()
          .map((s) => `<option>${e(s)}</option>`)
          .join("");
      const target = readUrl();
      render();
      SpotterMap.init((id) => select(id));
      if (target) select(target, { focus: false, push: false });
    }
    if (page === "saved") renderSaved();
    if (page === "contact") contact();
    if (page === "location") {
      const p = all.find((p) => p.slug === document.body.dataset.slug);
      if (p)
        document.querySelectorAll("[data-save]").forEach((b) => {
          b.setAttribute("aria-pressed", String(saveIds.includes(p.id)));
          b.innerHTML =
            U.icon("save") + (saveIds.includes(p.id) ? "Saved" : "Save");
        });
    }
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.select) select(b.dataset.select);
    if (b.dataset.save) toggleSave(b.dataset.save);
    if (b.dataset.remove) toggleSave(b.dataset.remove);
    if (b.dataset.share) share(b.dataset.share);
    if (b.hasAttribute("data-reset")) reset();
    if (b.hasAttribute("data-reload")) load();
    if (b.id === "close-detail" || b.id === "back-results") closeDetail();
    if (b.dataset.mode) chooseMode(b.dataset.mode);
    if (b.dataset.category) chooseMode(["RAN","Waypoint"].includes(b.dataset.category)?"charge":"visit",b.dataset.category);
    if (b.hasAttribute("data-type")) { if(selected) closeDetail(false); $("type-filter").value=b.dataset.type; render(); }
  });
  if (page === "explore") {
    $("search").addEventListener("input", () => { if(selected) closeDetail(false); render(); });
    for (const id of [
      "type-filter",
      "intent-filter",
      "state-filter",
      "open-filter",
      "saved-filter",
      "sort-filter",
    ])
      $(id).addEventListener("change", () => render());
    $("filter-toggle").addEventListener("click", () => {
      const open = $("extra-filters").hidden;
      $("extra-filters").hidden = !open;
      $("filter-toggle").setAttribute("aria-expanded", String(open));
    });
    $("clear-filters").addEventListener("click", reset);
    $("near-me").addEventListener("click", near);
    $("full-overview").addEventListener("click",()=>{if(selected) closeDetail(); SpotterMap.resetOverview();});
    $("map-mode").addEventListener("click", () => { if(selected) closeDetail(false); setView("map"); });
    $("list-mode").addEventListener("click", () => { if(selected) closeDetail(false); setView("list"); });
    $("retry-map").addEventListener("click", () => SpotterMap.init());
    $("search-area").addEventListener("click", () => {
      area = SpotterMap.bounds();
      $("search-area").hidden = true;
      render();
    });
    $("clear-area").addEventListener("click", () => {
      area = null;
      render(true);
    });
    window.addEventListener("popstate", () => {
      const target = readUrl();
      selected = null;
      $("detail").hidden = true;
      render();
      if (target) select(target, { focus: false, push: false });
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !$("detail").hidden) closeDetail();
    });
    setInterval(() => {
      if (!document.hidden && document.activeElement === document.body)
        render();
    }, 60000);
  }
  load();
})();
