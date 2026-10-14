/* Reproducible static release. Only explicitly public files enter dist. */
const fs = require("node:fs"),
  path = require("node:path");
const { buildPages } = require("./scripts/build-pages.cjs");
const { header } = require("./js/components.js");
const root = __dirname,
  dist = path.join(root, "dist");
const release = "2026.42.6";
const locations = JSON.parse(
  fs.readFileSync(path.join(root, "data/locations.json"), "utf8"),
);
if (!Array.isArray(locations) || !locations.length)
  throw Error("Canonical location array is empty");
require("./scripts/generate-data.cjs");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
function copy(file) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
for (const file of [
  "index.html",
  "admin.html",
  "admin-new.html",
  "offline.html",
  "service-worker.js",
  "manifest.json",
  "CNAME",
  "css/style.css",
  "js/components.js",
  "js/location-model.js",
  "js/map.js",
  "js/app.js",
  "js/config.js",
  "js/locations.js",
  "js/admin.js",
  "assets/spotter-mark.svg",
  "data/locations.json",
  "data/refresh-summary.json",
  "data/location-history.json",
])
  copy(file);
// Support both extensionless and legacy admin entry URLs. These pages contain
// only an authentication handoff; no maintenance interface is published.
for (const route of ["admin", "admin-new"]) {
  fs.mkdirSync(path.join(dist, route), { recursive: true });
  fs.copyFileSync(path.join(root, "admin.html"), path.join(dist, route, "index.html"));
}
let index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
index = index.replace(
  '<div data-site-header data-active="Explore"></div>',
  header("Explore"),
);
fs.writeFileSync(path.join(dist, "index.html"), index);
fs.mkdirSync(path.join(dist, "vendor"), { recursive: true });
for (const file of ["mapbox-gl.js", "mapbox-gl.css"])
  fs.copyFileSync(
    require.resolve("mapbox-gl/dist/" + file),
    path.join(dist, "vendor", file),
  );
const summary = JSON.parse(
  fs.readFileSync(path.join(root, "data/refresh-summary.json"), "utf8"),
);
const routes = buildPages(dist, locations, summary);
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
function versionAssets(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) versionAssets(file);
    else if (name.endsWith(".html"))
      fs.writeFileSync(
        file,
        fs
          .readFileSync(file, "utf8")
          .replace(
            /((?:src|href)="\/(?:js|css|vendor)\/[^"?]+\.(?:js|css))"/g,
            "$1?v=" + release + '"',
          ),
      );
  }
}
versionAssets(dist);
// These top-level entry pages are generated from scripts/build-pages.cjs, never hand edited.
for (const file of [
  "about.html",
  "contact.html",
  "stats.html",
  "saved.html",
  "updates.html",
  "404.html",
])
  fs.copyFileSync(path.join(dist, file), path.join(root, file));
const errors = [];
let htmlCount = 0;
function check(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) check(file);
    else if (name.endsWith(".html")) {
      htmlCount++;
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(
        /(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g,
      )) {
        const url = m[1];
        const target = path.join(dist, decodeURIComponent(url));
        if (!fs.existsSync(target))
          errors.push(path.relative(dist, file) + ": " + url);
      }
    }
  }
}
check(dist);
if (errors.length)
  throw Error("Broken local URLs:\n" + [...new Set(errors)].join("\n"));
console.log(
  `Built ${htmlCount} HTML pages and ${locations.length} location records. All internal route and asset references resolve.`,
);
