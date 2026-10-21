const test = require('node:test');
const assert = require('node:assert/strict');
const { catalog } = require('../scripts/export-ios-catalog.cjs');
const { combineLocations, locationTypes } = require('../js/location-model.js');
const places = require('../data/locations.json');
const charging = require('../data/charging.json');

test('public API export is deterministic and includes the complete canonical catalog', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'spotter-api-'));
  try {
    const target = path.join(directory, 'api/v1/catalog.json');
    const { writeCatalog } = require('../scripts/export-ios-catalog.cjs');
    writeCatalog(target);
    const first = fs.readFileSync(target, 'utf8');
    assert.deepEqual(JSON.parse(first), catalog());
    writeCatalog(target);
    assert.equal(fs.readFileSync(target, 'utf8'), first);
    assert.ok(Buffer.byteLength(first) < 20 * 1024 * 1024);
    assert.ok(!('visits' in JSON.parse(first)), 'No private journal data in the public feed');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('iOS catalog preserves website identities, aliases, and source dates', () => {
  const source = combineLocations(places, charging);
  const output = catalog();
  assert.equal(output.schemaVersion, 1);
  assert.equal(output.places.length, source.length);
  for (const p of source) {
    const exported = output.places.find(item => item.id === String(p.id));
    assert.ok(exported);
    assert.deepEqual(exported.aliases, (p.legacyIds || []).map(String));
    assert.equal(exported.checkedOn, p.lastVerified || null);
    assert.deepEqual(exported.directoryTypes, locationTypes(p), "Browse categories must match the website without losing service capabilities");
    assert.equal(exported.latitude, p.lat ?? null);
    assert.equal(exported.longitude, p.lng ?? null);
    if (p.capabilities?.includes('service')) assert.ok(exported.types.includes('Service Center'));
    for (const network of p.chargingNetworks || []) assert.ok(exported.types.includes(network.type));
  }
});

test('curated photos match place identities and distinguish shared charger imagery', () => {
  const { places } = catalog();
  const manifest = require('../data/location-photos.json');
  for (const [id, photo] of Object.entries(manifest.locations)) {
    const place = places.find(p => p.id === id || p.aliases.includes(id));
    assert.ok(place, `Unknown photo identity ${id}`);
    assert.deepEqual(place.photo, photo);
    assert.equal(photo.scope, 'location');
  }
  assert.match(places.find(p => p.id === '13').photo.imageURL, /LagunaBeach/);
  for (const type of ['RAN', 'Waypoint']) {
    const group = places.filter(p => p.types.includes(type) && p.photo?.scope === 'category');
    assert.ok(group.length > 0);
    assert.ok(group.every(p => p.photo?.scope === 'category'));
    assert.ok(group.every(p => p.photo.imageURL === manifest.categories[p.types.includes('RAN') ? 'RAN' : 'Waypoint'].imageURL));
  }
  assert.notEqual(manifest.categories.RAN.imageURL, manifest.categories.Waypoint.imageURL);
  assert.equal(places.find(p => p.id === '77').photo, null, 'Brea should not show a generic car as its building');
  for (const p of places.filter(p => p.photo)) {
    assert.ok(['media.rivian.com', 'photos.plugshare.com', 'cdn10.localdatacdn.com', 'cdn8.localdatacdn.com'].includes(new URL(p.photo.imageURL).hostname));
    assert.ok(['rivian.com', 'www.plugshare.com', 'www.loc8nearme.com'].includes(new URL(p.photo.sourceURL).hostname));
    assert.equal(new URL(p.photo.imageURL).protocol, 'https:');
    assert.ok(p.photo.credit && p.photo.description);
  }
  assert.equal(places.find(p => p.name === 'Barstow, CA').photo.scope, 'location');
  assert.equal(places.find(p => p.name === 'Lake Fork Campground').photo.scope, 'location');
  assert.equal(places.find(p => p.name === 'Hayward - Service Center').photo.scope, 'location');
  const siteImages = places.filter(p => p.photo?.scope === 'location').map(p => p.photo.imageURL);
  assert.equal(new Set(siteImages).size, siteImages.length, 'A site photo must not be reused across unrelated places');
});

test('native details preserve both networks, schedules, ports and internal nearby identities', () => {
  const output = catalog();
  const site = output.places.find(p => p.name === 'Corte Madera, CA');
  const text = JSON.stringify(site.information);
  assert.match(text, /Rivian Adventure Network/);
  assert.match(text, /Waypoints/);
  assert.match(text, /Time-of-use rates/);
  assert.match(text, /7:00am/);
  assert.match(text, /NACS/);
  assert.match(text, /Individual chargers/);
  assert.match(text, /Sources differ/);
  assert.match(text, /Not live availability/);
  const laguna = output.places.find(p => p.id === '13');
  assert.match(JSON.stringify(laguna.information), /949/);
  assert.doesNotMatch(JSON.stringify(laguna.information), /No longer listed/);
  for (const p of output.places) {
    for (const id of p.relatedPlaceIDs) assert.ok(output.places.some(other => other.id === id || other.aliases.includes(id)));
  }
  const planned = output.places.find(p => p.status === 'planned' && p.directoryTypes.includes('RAN'));
  assert.match(JSON.stringify(planned.information), /not an available charging stop/);
  assert.doesNotMatch(JSON.stringify(planned.information), /pricing/);
});

test('older charging detail rates cannot override a newer network snapshot', () => {
  const { chargingInformation } = require('../scripts/ios-place-information.cjs');
  const details = chargingInformation({type:'RAN', chargerCount:6, roamer:{
    observedAt:'2026-10-20T00:00:00Z', detailsObservedAt:'2026-10-19T00:00:00Z',
    rates:{Rivian:'$0.44'}, detailRates:{Rivian:'$0.99'}, reportedStatus:'Operational', detailReportedStatus:'Offline'
  }});
  const text = JSON.stringify(details);
  assert.match(text, /0.44/);
  assert.doesNotMatch(text, /0.99|Offline/);
});
