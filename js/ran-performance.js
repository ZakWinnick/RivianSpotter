/* Optional RAN detail data, published independently of the catalog. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.SpotterRanPerformance = factory(root.LocationModel.escapeHtml);
})(globalThis, function (escape) {
  "use strict";
  const dashes = ["", "9 4", "3 4", "12 4 3 4"];
  const timestamp = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  function renderStatus(availability, observedAt) {
    if (!availability) return "";
    const { working, total, reportedAt } = availability;
    if (!Number.isInteger(working) || !Number.isInteger(total) || working < 0 || working > total || total < 1) return "";
    const date = new Date(reportedAt || observedAt);
    const when = Number.isFinite(+date)
      ? " · " + (reportedAt ? "Reported " : "Checked ") + '<time datetime="' + escape(date.toISOString()) + '">' + escape(timestamp.format(date)) + "</time>"
      : "";
    return '<section class="ran-status"><h3>Charger status</h3><p><strong>' +
      working + " of " + total + " chargers working</strong></p>" +
      '<p class="charging-note">Equipment status' + when + "</p></section>";
  }

  function renderCurves(series) {
    if (!Array.isArray(series)) return "";
    const curves = series.filter(curve => typeof curve?.label === "string" && Array.isArray(curve.points) &&
      curve.points.length >= 2 && curve.points.every(point => Array.isArray(point) &&
        Number.isFinite(point[0]) && point[0] >= 0 && point[0] <= 100 &&
        Number.isFinite(point[1]) && point[1] >= 0 && point[1] <= 2000));
    if (!curves.length) return "";
    const left = 44, right = 466, top = 24, bottom = 202;
    const peak = Math.max(...curves.flatMap(curve => curve.points.map(point => point[1])));
    const step = Math.max(25, Math.ceil(peak / 100) * 25), limit = step * 4;
    const x = percent => left + percent / 100 * (right - left);
    const y = kw => bottom - kw / limit * (bottom - top);
    const lines = [0, 1, 2, 3, 4].map(index => {
      const kw = index * step;
      return '<line x1="' + left + '" x2="' + right + '" y1="' + y(kw) + '" y2="' + y(kw) + '"/>' +
        '<text x="' + (left - 8) + '" y="' + (y(kw) + 4) + '" text-anchor="end">' + kw + "</text>";
    }).join("");
    const percentLabels = [0, 20, 40, 60, 80, 100].map(percent =>
      '<text x="' + x(percent) + '" y="222" text-anchor="middle">' + percent + "%</text>").join("");
    const plot = curves.map((curve, index) => {
      const coordinates = curve.points.map(([percent, kw]) => x(percent).toFixed(2) + "," + y(kw).toFixed(2)).join(" ");
      return '<polyline class="ran-series-' + (index % 6) + '" points="' + coordinates + '" stroke-dasharray="' +
        dashes[index % dashes.length] + '"/>';
    }).join("");
    const rows = curves.map((curve, index) => {
      const duration = Number.isInteger(curve.minutes20To80) && curve.minutes20To80 > 0
        ? curve.minutes20To80 + " min" : "—";
      const count = Number.isInteger(curve.vehicleCount) && curve.vehicleCount > 0 ? curve.vehicleCount : "—";
      const swatch = '<svg class="ran-curve-key" aria-hidden="true" viewBox="0 0 20 10"><path class="ran-series-' +
        (index % 6) + '" d="M0 5H20" stroke-dasharray="' + dashes[index % dashes.length] + '"/></svg>';
      return '<tr><th scope="row">' + swatch + escape(curve.label) + "</th><td>" + duration + "</td><td>" + count + "</td></tr>";
    }).join("");
    return '<section class="ran-curves"><h3>Charging curves</h3><p class="charging-note">Observed charging over the last 12 months, by model and battery pack.</p>' +
      '<svg class="ran-curve-plot" viewBox="0 0 490 252" role="img" aria-label="Charging power in kilowatts by battery percentage">' +
      '<g class="ran-curve-grid"><text x="' + left + '" y="12">kW</text>' + lines + percentLabels +
      '<text x="255" y="247" text-anchor="middle">Battery charge</text></g>' + plot +
      '</svg><div class="table-scroll"><table><thead><tr><th scope="col">Vehicle and pack</th><th scope="col">20–80%</th>' +
      '<th scope="col">Vehicles</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
  }

  async function mount(container) {
    const target = container.querySelector("[data-ran-performance]");
    if (!target) return;
    try {
      const response = await fetch("/data/ran-performance.json", {cache: "no-cache", signal: AbortSignal.timeout(5000)});
      if (!response.ok) return;
      const feed = await response.json();
      const station = feed.schemaVersion === 1 && feed.stations?.[target.dataset.ranPerformance];
      if (station && target.isConnected) {
        target.innerHTML = renderStatus(station.availability, station.observedAt) + renderCurves(station.curves);
      }
    } catch {
      // Station details still work when the companion feed is unavailable.
    }
  }

  return {mount, renderStatus, renderCurves};
});
