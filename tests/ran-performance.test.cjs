const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { parseStation, refresh } = require('../scripts/refresh-ran-preview.cjs');
const { escapeHtml } = require('../js/location-model.js');
const ui = require('../js/components.js');
const view = require('../js/ran-performance.js')(escapeHtml);

const stationId = 'US-RIV-L123';
const seen = '2026-11-25T20:00:00.000Z';
const chart = {
  series: [
    {name: 'R1 Gen 2 Max', data: [['20%', 140], ['80%', 52]]},
    {name: 'R2 Large', data: [['20%', 120], ['80%', 50]]},
    {name: 'Invalid series', data: [['20%', 140], ['10%', 100]]},
  ],
  summary: {slots: [
    {series: 'R1 Gen 2 Max', label: '20 to 80%, R1 Gen 2 Max', value: '33m'},
    {series: 'R2 Large', label: '20 to 80%, R2 Large', value: '24m'},
  ]},
};
function page(id, figure = true) {
  return '<body data-navigation-page="charging_sites:show:' + id + '"><main><h1>Example</h1><div>0 of 6</div>' +
    '<p>Chargers working as of <time datetime="2026-11-25T19:00:00Z">earlier</time></p>' +
    (figure ? '<section><h2>Charging power here, kW</h2><p>Based on 13 R1 Gen 2 Max and 5 R2 Large vehicles.</p>' +
      '<figure data-chart-config-value=\'' + JSON.stringify(chart) + '\'></figure></section>' : '') + '</main></body>';
}

test('reads working count and validated observed curves for the expected station', () => {
  const result = parseStation(page(stationId), stationId, seen);
  assert.deepEqual(result.availability, {working: 0, total: 6, reportedAt: '2026-11-25T19:00:00.000Z'});
  assert.deepEqual(result.curves.map(c => [c.label, c.minutes20To80, c.vehicleCount]), [
    ['R1 Gen 2 Max', 33, 13],
    ['R2 Large', 24, 5],
  ]);
  assert.deepEqual(result.curves[0].points, [[20, 140], [80, 52]]);
  assert.deepEqual(parseStation(page(stationId, false), stationId, seen).curves, []);
  assert.throws(() => parseStation(page('US-RIV-L456'), stationId, seen), /identity mismatch/);
});

test('availability and curve cards can display independently', () => {
  const result = parseStation(page(stationId), stationId, seen);
  assert.match(view.renderStatus(result.availability, seen), /0 of 6 chargers available/);
  assert.match(view.renderStatus(result.availability, seen), /Reported/);
  assert.equal(view.renderStatus(null, seen), '');
  assert.equal(view.renderCurves([]), '');
  const curves = view.renderCurves(result.curves);
  assert.equal((curves.match(/<polyline/g) ?? []).length, 2);
  assert.match(curves, /20–80%/);
  assert.match(curves, /33 min/);
});

test('the map explorer loads the same charging panel as a full RAN page', async () => {
  const [shell, explorer] = await Promise.all(['index.html', 'js/app.js'].map(file =>
    fs.readFile(path.join(__dirname, '..', file), 'utf8')));
  assert.match(shell, /src="\/js\/ran-performance\.js".*src="\/js\/app\.js"/s);
  assert.match(explorer, /U\.chargingDetails\(p, \{showPerformance: true\}\)/);
  assert.match(explorer, /SpotterRanPerformance\?\.mount\(detailSheet\)/);
});

test('a coming-soon RAN page keeps a charging performance section', () => {
  const site = {type: 'RAN', status: 'planned', sourceId: 'planned-site', city: 'Example', state: 'CA'};
  assert.match(ui.chargingDetails(site, {showPerformance: true}), /data-ran-performance-state="planned"/);
  assert.doesNotMatch(ui.chargingDetails({...site, type: 'Waypoint'}, {showPerformance: true}), /data-ran-performance/);
});

test('an in-service count stays visible when the station has no observed curves', async () => {
  const station = parseStation(page(stationId, false), stationId, seen);
  const {module, target, container, code} = await mountFixture();
  vm.runInNewContext(code, {
    module, AbortSignal, location: {hostname: 'example.com'},
    fetch: async () => Response.json({schemaVersion: 1, stations: {[stationId]: station}}),
  });
  await module.exports(escapeHtml).mount(container);
  assert.match(target.innerHTML, /0 of 6 chargers available/);
  assert.match(target.innerHTML, /Charging curves/);
  assert.match(target.innerHTML, /No charging curves have been reported/);
});

test('a feed failure leaves an explicit status instead of an empty panel', async () => {
  const {module, target, container, code} = await mountFixture();
  vm.runInNewContext(code, {
    module, AbortSignal, location: {hostname: 'example.com'},
    fetch: async () => new Response('', {status: 503}),
  });
  await module.exports(escapeHtml).mount(container);
  assert.match(target.innerHTML, /Charger status.*Temporarily unavailable/);
  assert.match(target.innerHTML, /Charging curves.*Temporarily unavailable/);
});

async function mountFixture() {
  const module = {exports: {}};
  const target = {dataset: {ranPerformance: stationId}, isConnected: true, innerHTML: ''};
  const container = {querySelector: () => target};
  const code = await fs.readFile(path.join(__dirname, '../js/ran-performance.js'), 'utf8');
  return {module, target, container, code};
}

test('rate limiting stops the sweep and preserves the prior station snapshot', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ran-preview-test-'));
  t.after(() => fs.rm(folder, {force: true, recursive: true}));
  const output = path.join(folder, 'snapshot.json');
  const options = {output, stationIds: [stationId], now: () => Date.parse(seen)};
  await refresh({...options, fetchPage: async () => new Response(page(stationId))});
  const report = await refresh({
    ...options,
    stationIds: ['US-RIV-L456', stationId],
    fetchPage: async () => new Response('', {status: 429, headers: {'Retry-After': '28800'}}),
    pause: () => assert.fail('Rate limiting must stop subsequent requests'),
  });
  assert.equal(report.coolingDown, true);
  const saved = JSON.parse(await fs.readFile(output));
  assert.deepEqual(saved.stations[stationId], parseStation(page(stationId), stationId, seen));
  assert.equal(saved.nextRequestAfter, '2026-11-26T04:00:00.000Z');
  const blocked = await refresh({...options, fetchPage: () => assert.fail('Cooldown must skip requests')});
  assert.deepEqual(blocked, {checked: 0, failed: 0, coolingDown: true});
});
