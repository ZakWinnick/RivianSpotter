const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { load } = require('cheerio');
const M = require('../js/location-model.js');
const { buildPages } = require('../scripts/build-pages.cjs');
const template = require('../data/locations.json')[0];
const place = (id, lat, extra = {}) => ({ ...template, id, slug: id, name: id, lat, lng: 0,
  state: 'CA', country: 'US', coordinatePrecision: 'exact', listed: true, status: 'open', legacySlugs: [], ...extra });

test('site distances handle shared pins, approximate pins, missing pins and the date line', () => {
  const origin = place('origin', 0);
  assert.equal(M.placeDistanceLabel(origin, place('north', 1)), '69.1 mi');
  assert.equal(M.placeDistanceLabel(origin, origin), '<0.1 mi');
  assert.equal(M.placeDistanceLabel(origin, place('planned', 1, { status: 'planned', coordinatePrecision: 'city' })), 'Approx. 69.1 mi');
  assert.equal(M.placeDistanceLabel(place('planned', 0, { status: 'planned', coordinatePrecision: 'permit-address' }), origin), 'Approx. <0.1 mi');
  for (const bad of [{ lat: null }, { lat: 91 }, { lng: NaN }, { coordinatePrecision: 'unknown' }]) {
    assert.equal(M.placeDistanceLabel(origin, { ...origin, ...bad }), null);
    assert.equal(M.placeDistanceLabel({ ...origin, ...bad }, origin), null);
  }
  assert.equal(M.placeDistanceLabel({ ...origin, lng: 179.5 }, { ...origin, lng: -179.5 }), '69.1 mi');
});

test('location pages show site distances nearest first without leaking into region listings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-distances-'));
  try {
    const records = [place('origin', 0), place('far', 2), place('near', 1), place('unknown', null),
      place('unlisted', 0.1, { listed: false }), place('other-region', 0.1, { state: 'NV' })];
    buildPages(dir, records);
    const $ = load(fs.readFileSync(path.join(dir, 'locations/origin/index.html'), 'utf8'));
    const nearby = $('section').filter((_, el) => $(el).find('h2').text().startsWith('More places'));
    assert.deepEqual(nearby.find('.link-row strong').map((_, el) => $(el).text()).get(), ['near', 'far', 'unknown']);
    assert.deepEqual(nearby.find('.place-distance').map((_, el) => $(el).text()).get(), ['69.1 mi', '138.2 mi', 'Distance unavailable']);
    assert.match(nearby.text(), /Straight-line distances from this location/);
    assert.equal(nearby.find('.link-row').first().attr('href'), '/locations/near/');
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'regions/ca/index.html'), 'utf8'), /place-distance|Distance unavailable/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
