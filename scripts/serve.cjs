const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../dist"),
  port = Number(process.env.PORT || 8765);
const snapshot = process.env.RIVSPOTTER_PREVIEW_SNAPSHOT;
const performanceFile = process.env.RIVSPOTTER_PREVIEW_PERFORMANCE;
const routes = snapshot && JSON.parse(fs.readFileSync(path.join(snapshot, "data/beta-routes.json"), "utf8"));

function previewFile(urlPath, fallback) {
  if (!routes) return fallback;
  if (urlPath === "/data/ran-performance.json" && performanceFile) return performanceFile;
  if (urlPath === "/api/v1/catalog.json" || /^\/data\/[a-z0-9-]+\.json$/.test(urlPath)) {
    const snapshotFile = path.join(snapshot, urlPath);
    return fs.existsSync(snapshotFile) ? snapshotFile : fallback;
  }
  const detail = /^\/(locations|regions)\/([a-z0-9-]+)(?:\/index\.html|\/)?$/.exec(urlPath);
  if (detail) {
    const known = detail[1] === "locations" ? Object.hasOwn(routes.locations, detail[2]) : routes.regions.includes(detail[2]);
    return known ? path.join(root, "dynamic.html") : null;
  }
  if (/^\/(locations|regions)(?:\/(?:index\.html)?)?$/.test(urlPath) ||
      ["/updates.html", "/stats.html", "/changelog.html"].includes(urlPath)) return path.join(root, "dynamic.html");
  return fallback;
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
http
  .createServer((req, res) => {
    let p;
    try {
      p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let file = path.resolve(root, "." + p);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      file = previewFile(p, file);
      if (!file) throw new Error("Unknown preview route");
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      const buf = fs.readFileSync(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : buf);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(path.join(root, "404.html")));
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Preview: http://127.0.0.1:${port}`),
  );
