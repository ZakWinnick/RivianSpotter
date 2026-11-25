/* Companion data for the isolated web preview. The main catalog keeps its own refresh. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { load } = require('cheerio');

const ORIGIN = 'https://evroamer.com';
const SITE_ID = /^US-RIV-L\d+$/;
const REQUEST_SPACING = 15_000;
const DEFAULT_COOLDOWN = 6 * 60 * 60 * 1000;
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

function parseMinutes(value) {
  const match = /^(?:(\d{1,2})h\s*)?(\d{1,3})m$/.exec(clean(value));
  if (!match) return null;
  const minutes = Number(match[1] || 0) * 60 + Number(match[2]);
  return minutes > 0 && minutes <= 1440 ? minutes : null;
}

function parsePoints(data) {
  if (!Array.isArray(data) || data.length < 2 || data.length > 101) return null;
  let previous = -1;
  const points = [];
  for (const point of data) {
    if (!Array.isArray(point) || !/^\d{1,3}%$/.test(point[0])) return null;
    const percent = Number(point[0].slice(0, -1));
    const kw = point[1];
    if (percent <= previous || percent > 100 || !Number.isFinite(kw) || kw < 0 || kw > 2000) return null;
    points.push([percent, kw]);
    previous = percent;
  }
  return points;
}

function parseCurves($, main) {
  const section = main.find('h2').filter((_, heading) => /^Charging power here, kW$/i.test(clean($(heading).text()))).first().parent();
  if (!section.length) return [];
  const raw = section.find('[data-chart-config-value]').first().attr('data-chart-config-value');
  if (!raw || raw.length > 200_000) throw new Error('Invalid charging chart');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.series) || config.series.length > 30) throw new Error('Invalid charging series');
  const slots = new Map((Array.isArray(config.summary?.slots) ? config.summary.slots : [])
    .filter(slot => slot && /^20 to 80%,/i.test(slot.label))
    .map(slot => [slot.series, parseMinutes(slot.value)]));
  const description = clean(section.children('p').first().text());
  const labels = new Set();
  return config.series.flatMap(series => {
    const label = clean(series?.name);
    const points = parsePoints(series?.data);
    if (!label || label.length > 100 || labels.has(label) || !points) return [];
    labels.add(label);
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = Number(description.match(new RegExp(`(?:^|\\s)(\\d+)\\s+${escapedLabel}(?=[,.;]|\\s(?:and|cars?|vehicles?)\\b|$)`, 'i'))?.[1]);
    return [{
      label,
      points,
      minutes20To80: slots.get(label) ?? null,
      vehicleCount: Number.isSafeInteger(count) && count > 0 ? count : null,
    }];
  });
}

function parseAvailability($, main) {
  const note = main.find('p').filter((_, paragraph) => /^chargers? working(?:\s|$)/i.test(clean($(paragraph).text()))).first();
  const counts = /^(\d+) of (\d+)$/.exec(clean(note.prev().text()));
  if (!counts) return null;
  const [working, total] = counts.slice(1).map(Number);
  if (working > total || total < 1 || total > 1000) throw new Error('Invalid charger counts');
  const reported = Date.parse(note.find('time[datetime]').first().attr('datetime') ?? '');
  return { working, total, reportedAt: Number.isFinite(reported) ? new Date(reported).toISOString() : null };
}

function parseStation(html, sourceId, observedAt) {
  const $ = load(html);
  const main = $('main');
  if ($('body').attr('data-navigation-page') !== `charging_sites:show:${sourceId}` || !main.find('h1').length) {
    throw new Error('Station identity mismatch');
  }
  return { observedAt, availability: parseAvailability($, main), curves: parseCurves($, main) };
}

async function readPrior(file) {
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (data.schemaVersion !== 1 || !data.stations || typeof data.stations !== 'object' || Array.isArray(data.stations)) {
      throw new Error('Invalid saved preview snapshot');
    }
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { schemaVersion: 1, stations: {} };
  }
}

async function writeSnapshot(output, snapshot) {
  const staging = `${output}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(staging, JSON.stringify(snapshot) + '\n');
    await fs.rename(staging, output);
  } finally {
    await fs.rm(staging, { force: true });
  }
}

async function refresh({
  output,
  stationIds,
  fetchPage = fetch,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = Date.now,
}) {
  const unique = [...new Set(stationIds)];
  if (!unique.length || unique.some(id => !SITE_ID.test(id))) throw new Error('Invalid RAN station list');
  await fs.mkdir(path.dirname(output), { recursive: true });
  const lock = `${output}.lock`;
  const handle = await fs.open(lock, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error('Preview refresh already running or its lock needs inspection');
    throw error;
  });
  try {
    const snapshot = await readPrior(output);
    if (Date.parse(snapshot.nextRequestAfter) > now()) return { checked: 0, failed: 0, coolingDown: true };
    delete snapshot.nextRequestAfter;
    unique.sort((a, b) => (snapshot.stations[a]?.observedAt ?? '').localeCompare(snapshot.stations[b]?.observedAt ?? ''));
    let checked = 0;
    let failed = 0;
    let consecutiveFailures = 0;
    for (const [index, id] of unique.entries()) {
      if (index) await pause(REQUEST_SPACING);
      try {
        const response = await fetchPage(`${ORIGIN}/charging/sites/${id}`, {
          signal: AbortSignal.timeout(25_000),
          headers: { 'User-Agent': 'RivSpotter/1.0 (+https://rivspotter.com/about.html)' },
        });
        if (response.status === 429) {
          const retry = response.headers.get('retry-after');
          const seconds = Number(retry);
          const retryAt = seconds > 0 ? now() + seconds * 1000 : Date.parse(retry ?? '');
          snapshot.nextRequestAfter = new Date(Math.max(now() + DEFAULT_COOLDOWN, retryAt || 0)).toISOString();
          await writeSnapshot(output, snapshot);
          break;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (html.length > 5_000_000) throw new Error('Oversized station response');
        const station = parseStation(html, id, new Date(now()).toISOString());
        snapshot.stations[id] = station;
        await writeSnapshot(output, snapshot);
        checked++;
        consecutiveFailures = 0;
      } catch (error) {
        failed++;
        consecutiveFailures++;
        console.warn(`${id}: ${error.message}`);
        if (consecutiveFailures >= 3) break;
      }
    }
    return { checked, failed, coolingDown: Boolean(snapshot.nextRequestAfter) };
  } finally {
    await handle.close();
    await fs.rm(lock);
  }
}

async function main() {
  const [output, ...requested] = process.argv.slice(2);
  if (!output) throw new Error('Usage: node scripts/refresh-ran-preview.cjs OUTPUT [SITE_IDS...]');
  const catalogFile = process.env.RIVSPOTTER_RAN_CATALOG || path.join(__dirname, '../data/charging.json');
  const directory = JSON.parse(await fs.readFile(catalogFile, 'utf8'));
  const eligible = directory.filter(p => p.type === 'RAN' && p.listed !== false && p.status !== 'planned').map(p => p.sourceId);
  if (requested.some(id => !eligible.includes(id))) throw new Error('Unrecognized RAN station ID');
  const report = await refresh({ output, stationIds: requested.length ? requested : eligible });
  console.log(JSON.stringify(report));
  if (report.failed || report.coolingDown) process.exitCode = 1;
}

module.exports = { parseStation, refresh };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
