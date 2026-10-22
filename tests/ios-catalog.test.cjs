const test = require('node:test');
const assert = require('node:assert/strict');
const exporter = require('../scripts/export-ios-catalog.cjs');
// Tests run in parallel processes, so they read the committed manifest and never write it.
const catalog = () => exporter.catalog({ updateRevision: false });
const { combineLocations, locationTypes } = require('../js/location-model.js');
const places = require('../data/locations.json');
const charging = require('../data/charging.json');

test('catalog revisions advance for same-day edits and removals, and persist for unchanged content', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { revisionFor } = require('../scripts/catalog-revision.cjs');
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'spotter-revision-'));
  const file = path.join(directory, 'revision.json');
  try {
    const original = { places: [{ id: 'saved', status: 'planned', checkedOn: '2026-10-20' }] };
    const opened = { places: [{ id: 'saved', status: 'open', checkedOn: '2026-10-20' }] };
    assert.equal(revisionFor(original, file, 1000), 1000);
    assert.equal(revisionFor(original, file, 2000), 1000);
    assert.equal(revisionFor(opened, file, 1000), 1001, 'Same clock tick still advances');
    assert.equal(revisionFor({ places: [] }, file, 900), 1002, 'Removal and clock rollback still advance');
    assert.equal(revisionFor(original, file, 1000), 1003, 'Intentional content rollback is a new revision');
    assert.equal(revisionFor(original, file, 3000), 1003);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('the committed revision manifest matches the current location data', () => {
  const fs = require('node:fs');
  const { digestOf } = require('../scripts/catalog-revision.cjs');
  const manifest = JSON.parse(fs.readFileSync(exporter.manifestPath, 'utf8'));
  assert.equal(manifest.digest, digestOf(exporter.catalogContent()),
    'data/catalog-revision.json is stale: run `node scripts/export-ios-catalog.cjs` and commit the manifest and bundled catalog. ' +
    'Otherwise every CI deploy would publish a new, uncommitted revision.');
});

test('a stale manifest is rejected without writing when revisions may not be updated', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { revisionFor } = require('../scripts/catalog-revision.cjs');
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'spotter-stale-'));
  const file = path.join(directory, 'revision.json');
  try {
    assert.equal(revisionFor({ places: [1] }, file, 1000), 1000);
    const before = fs.readFileSync(file, 'utf8');
    assert.equal(revisionFor({ places: [1] }, file, 5000, { update: false }), 1000, 'Unchanged content is fine');
    assert.throws(() => revisionFor({ places: [2] }, file, 5000, { update: false }), /out of date/);
    assert.equal(fs.readFileSync(file, 'utf8'), before);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('the bundled iOS catalog never claims a newer revision than the manifest', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const bundled = JSON.parse(fs.readFileSync(path.join(__dirname, '../ios/Sources/SpotterCore/Resources/catalog.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(exporter.manifestPath, 'utf8'));
  assert.ok(Number.isSafeInteger(bundled.revision) && bundled.revision > 0, 'Bundled catalog needs a revision');
  // A bundle ahead of the published feed would make the app reject every download.
  assert.ok(bundled.revision <= manifest.revision,
    `Bundled revision ${bundled.revision} is newer than the manifest ${manifest.revision}; regenerate with node scripts/export-ios-catalog.cjs.`);
  // Scheduled refreshes advance the manifest without touching the bundle, so an older bundle is fine.
  // The same revision must mean the same content.
  if (bundled.revision === manifest.revision) {
    const { revision, ...content } = bundled;
    assert.deepEqual(content, exporter.catalogContent(), 'Bundled catalog content differs from the manifest revision it claims');
  }
});

test('public API export is deterministic and includes the complete canonical catalog', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'spotter-api-'));
  try {
    const target = path.join(directory, 'api/v1/catalog.json');
    const writeCatalog = file => exporter.writeCatalog(file, { updateRevision: false });
    writeCatalog(target);
    const first = fs.readFileSync(target, 'utf8');
    assert.deepEqual(JSON.parse(first), catalog());
    assert.ok(Number.isSafeInteger(JSON.parse(first).revision));
    assert.equal(JSON.parse(first).revision, require('../data/catalog-revision.json').revision);
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
    assert.ok(['media.rivian.com', 'photos.plugshare.com', 'cdn10.localdatacdn.com', 'cdn8.localdatacdn.com', 'rivianspotter.com'].includes(new URL(p.photo.imageURL).hostname));
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

test('native details preserve both networks, schedules and ports independently of refreshed station facts', () => {
  const { informationFor } = require('../scripts/ios-place-information.cjs');
  // Live charger counts, connectors and rate schedules change during daily refreshes.
  // Exercise presentation using controlled inputs rather than a specific site's current facts.
  const site = { type: 'RAN', chargingNetworks: [
    { type: 'RAN', chargerCount: 10, maxKw: 300, roamer: {
      chargerCount: 10, observedAt: '2026-10-20T00:00:00Z',
      detailsObservedAt: '2026-10-20T00:00:00Z', reportedStatus: 'Operational',
      connectorSummary: '10 NACS',
      detailRates: { Rivian: '$0.39–0.55/kWh Time-of-Use Rates Mon-Fri 7:00am-7:00pm$0.55' },
      chargers: [{ name: '1A', connector: 'NACS', powerKw: 300 }]
    } },
    { type: 'Waypoint', chargerCount: 3, maxKw: 11 }
  ] };
  const text = JSON.stringify(informationFor(site));
  assert.match(text, /Rivian Adventure Network/);
  assert.match(text, /Waypoints/);
  assert.match(text, /Time-of-use rates/);
  assert.match(text, /7:00am/);
  assert.match(text, /NACS/);
  assert.match(text, /Individual chargers/);
  assert.doesNotMatch(text, /Sources differ/);
  assert.match(text, /Not live availability/);
});

test('native charger-count discrepancy appears only when the published counts differ', () => {
  const { chargingInformation } = require('../scripts/ios-place-information.cjs');
  for (const [official, reported, differs] of [[8, 10, true], [10, 8, true], [10, 10, false], [10, null, false]]) {
    const information = chargingInformation({ type: 'RAN', chargerCount: official,
      roamer: { chargerCount: reported, observedAt: '2026-10-21T00:00:00Z' } });
    const facts = information[0].facts;
    assert.equal(facts.find(f => f.title === 'Chargers').value, String(official));
    const discrepancy = facts.find(f => f.title === 'Charger count in community snapshot');
    assert.equal(Boolean(discrepancy), differs, `Official ${official}, reported ${reported}`);
    if (differs) {
      assert.match(discrepancy.value, new RegExp(`${reported} reported.*Rivian lists ${official}.*Sources differ`));
    } else assert.doesNotMatch(JSON.stringify(information), /Sources differ/);
  }
});

test('native catalog preserves contact details, planned-site wording and internal nearby identities', () => {
  const output = catalog();
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

test('native presentation shares website grade selection, colors, booking links and charging labels', () => {
  const { locationReliability, locationGrade, gradePresentation } = require('../js/components.js');
  const { safeUrl } = require('../js/location-model.js');
  const source = combineLocations(places, charging, require('../data/roamer.json').stations);
  const exported = catalog().places;
  for (const place of source) {
    const native = exported.find(p => p.id === String(place.id));
    assert.deepEqual(native.reliability, locationReliability(place));
    assert.equal(native.bookingURL, safeUrl(place.bookingUrl, 'rivian.com'));
    assert.equal(native.phone, place.phone || null);
    if (native.reliability) {
      assert.match(locationGrade(place), new RegExp(`reliability-${native.reliability.tone}`));
      assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname, '../css/style.css'), 'utf8'),
        new RegExp(native.reliability.background, 'i'));
    }
    if (place.status === 'planned') assert.equal(native.reliability, null);
  }
  const combined = exported.find(p => p.name === 'Corte Madera, CA');
  assert.ok(combined.information.some(s => s.tags?.includes('DC Fast Charging')));
  assert.ok(combined.information.some(s => s.tags?.includes('Level 2 Charging')));
  assert.ok(combined.information.filter(s => s.metrics).every(s => s.metrics.length === 2));
  assert.equal(gradePresentation({reliabilityGrade:'A+'}).tone, 'neutral');
  assert.equal(gradePresentation({reliabilityGrade:'B',reliabilityTone:'invalid'}).background, '#84cc16');
  assert.equal(gradePresentation({reliabilityGrade:'unknown'}), null);
  assert.equal(locationReliability({status:'planned',reliabilityGrade:'A'}), null);
});
