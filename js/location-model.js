/* Shared by the browser, page generator and behavioral tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LocationModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function safeUrl(value, domain) {
    try {
      const u = new URL(value);
      return u.protocol === "https:" &&
        (!domain || u.hostname === domain || u.hostname.endsWith("." + domain))
        ? u.href
        : null;
    } catch {
      return null;
    }
  }
  function coordinates(p) {
    return (
      p &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180
    );
  }
  function formatDate(value) {
    if (!value) return "Date unavailable";
    const d = new Date(String(value).slice(0, 10) + "T12:00:00Z");
    return Number.isNaN(+d)
      ? "Date unavailable"
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(d);
  }
  function clock(s) {
    const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (!m || +m[1] > 12 || +m[1] < 1 || +(m[2] || 0) > 59) return null;
    return (
      (+m[1] % 12) * 60 + +(m[2] || 0) + (m[3].toLowerCase() === "pm" ? 720 : 0)
    );
  }
  function schedule(text) {
    if (typeof text !== "string" || !text.trim()) return null;
    if (/^(?:open )?24\/7$/i.test(text.trim())) return Object.fromEntries(DAYS.map((_,i)=>[i,[[0,1440]]]));
    const normalized = text
      .toLowerCase()
      .replace(/[–—−]/g, "-")
      .replace(/\u00a0/g, " ")
      .replace(/\n\s*24-hour restroom access\s*/g, "")
      .replace(/sat\s*&\s*sun/g, "sat-sun")
      .replace(/\./g, "");
    const day =
      "(?:sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)";
    const regex = new RegExp(
      "(" +
        day +
        "(?:\\s*-\\s*" +
        day +
        ")?)\\s*:\\s*(.*?)(?=" +
        day +
        "\\s*(?:-|:)|$)",
      "gis",
    );
    const result = {};
    let found = false,
      m;
    while ((m = regex.exec(normalized))) {
      const range = m[1]
        .split("-")
        .map((x) => DAYS.indexOf(x.trim().slice(0, 3)));
      if (range.some((x) => x < 0)) return null;
      let value = m[2]
          .trim()
          .replace(/[,;]+$/, "")
          .trim(),
        periods = [];
      if (value === "closed") periods = [];
      else if (/^(?:by )?appointments? only$/.test(value)) periods = null;
      else if (/^(open )?24 hours$/.test(value)) periods = [[0, 1440]];
      else {
        const parts = value.split(/\s*[,;]\s*/);
        for (const part of parts) {
          const bits = part.split(/\s*-\s*/);
          if (bits.length !== 2) return null;
          const a = clock(bits[0]),
            b = clock(bits[1]);
          if (a === null || b === null) return null;
          periods.push([a, b]);
        }
      }
      let d = range[0],
        end = range[range.length - 1];
      for (let count = 0; count < 7; count++) {
        result[d] = periods;
        if (d === end) break;
        d = (d + 1) % 7;
      }
      found = true;
    }
    return found ? result : null;
  }
  function getHoursState(p, now = new Date(), mode = "general") {
    if(mode === "general" && p.type === "Service Center") mode = "service";
    const labels = {
      planned: "Coming soon",
      "temporarily-closed": "Temporarily closed",
      closed: "Permanently closed",
    };
    if (labels[p.status]) return { state: p.status, label: labels[p.status] };
    if (mode === "service" && labels[p.serviceStatus])
      return {
        state: p.serviceStatus,
        label: "Service " + labels[p.serviceStatus].toLowerCase(),
      };
    const unknown = { state: "unknown", label: mode === "charging" ? "Charging hours not listed" : "Hours not listed" };
    if (
      !p.timezone ||
      p.status !== "open"
    )
      return unknown;
    let local;
    try {
      local = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: p.timezone,
          weekday: "short",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(now)
          .map((v) => [v.type, v.value]),
      );
    } catch {
      return unknown;
    }
    const date = `${local.year}-${local.month}-${local.day}`,
      d = DAYS.indexOf(local.weekday.toLowerCase()),
      minutes = +local.hour * 60 + +local.minute;
    const exception = (p.hoursExceptions || []).find(
      (e) => e.date === date && (!e.mode || e.mode === mode),
    );
    if (exception?.closed) return { state: "closed", label: "Closed today" };
    const s = schedule(
      exception?.hours || (mode === "service" ? p.serviceHours : mode === "charging" ? p.chargingHours : p.hours),
    );
    if (!s) return unknown;
    const today = s[d] || [],
      previous = s[(d + 6) % 7] || [];
    const open =
      today.some(([a, b]) =>
        b > a ? minutes >= a && minutes < b : minutes >= a,
      ) || previous.some(([a, b]) => b < a && minutes < b);
    if (!open && s[d] == null) return unknown;
    return {
      state: open ? "open" : "closed",
      label: mode === "charging" ? (open ? "Within charging hours" : "Outside charging hours") : open
        ? mode === "service"
          ? "Service open now"
          : "Open now"
        : mode === "service"
          ? "Service closed now"
          : "Closed now",
    };
  }
  function distanceMiles(a, b) {
    if (!coordinates(a) || !coordinates(b)) return Infinity;
    const rad = Math.PI / 180,
      dlat = (b.lat - a.lat) * rad,
      dlng = (b.lng - a.lng) * rad;
    const h =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlng / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  function filterLocations(list, f = {}) {
    const q = (f.query || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    return list.filter(
      (p) =>
        q.every((w) =>
          [
            p.name,
            p.address,
            p.city,
            p.state,
            p.country,
            p.type,
            ...(p.services || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(w),
        ) &&
        (!f.type || p.type === f.type) &&
        (!f.state || p.state === f.state) &&
        (!f.intent || (p.capabilities || []).includes(f.intent)) &&
        (!f.savedOnly || (f.savedIds || []).includes(p.id)) &&
        (!f.openNow ||
          getHoursState(
            p,
            f.now || new Date(),
            ["service","charging"].includes(f.intent) ? f.intent : "general",
          ).state === "open"),
    );
  }
  function getDirectionsUrl(p) {
    const published = safeUrl(p.officialDirectionsUrl);
    if (published && p.coordinatePrecision === "exact" && new URL(published).hostname === "maps.app.goo.gl") return published;
    return (p.sourceKind === "directory" && p.address && p.city && p.state) ||
      (p.coordinatePrecision === "exact" && coordinates(p))
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address + ", " + p.city + ", " + p.state)}&travelmode=driving`
      : null;
  }
  function getOfficialLink(p) {
    // A page containing shared map data is provenance, not this place's page.
    if (p.sourceKind === "service-map") return {
      url: "https://rivian.com/experience/service#map",
      label: "Rivian Service Centers",
      locationSpecific: false,
    };
    const url = safeUrl(p.rivianUrl, "rivian.com");
    if (!url) return null;
    const locationSpecific = new URL(url).pathname.startsWith("/spaces/") &&
      new URL(url).pathname !== "/spaces/locations";
    return { url, label: locationSpecific ? "Official Location" : "Rivian Location Directory", locationSpecific };
  }
  function locationUrl(p) {
    return "/locations/" + encodeURIComponent(p.slug) + "/";
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  return {
    safeUrl,
    coordinates,
    formatDate,
    schedule,
    getHoursState,
    distanceMiles,
    filterLocations,
    getDirectionsUrl,
    getOfficialLink,
    locationUrl,
    escapeHtml,
  };
});
