// Reuse the website's identity/grouping rules; never edit the generated catalog.
const fs = require('node:fs');
const path = require('node:path');
const { combineLocations, locationTypes } = require('../js/location-model.js');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const photos = read('location-photos.json');
const { informationFor } = require('./ios-place-information.cjs');
const { locationReliability } = require('../js/components.js');
const { safeUrl } = require('../js/location-model.js');
function photoFor(place) {
  const own = [place.id, ...(place.legacyIds || [])].map(String).map(id => photos.locations[id]).find(Boolean);
  if (own) return own;
  const types = locationTypes(place);
  // A Space without its own photograph must not inherit a charger photograph.
  if (types.some(type => ['Space', 'Outpost'].includes(type))) return null;
  return photos.categories[types.includes('RAN') ? 'RAN' : types.includes('Waypoint') ? 'Waypoint' : ''] || null;
}
function catalogContent() {
  const places = combineLocations(read('locations.json'), read('charging.json'), read('roamer.json').stations);
  const output = { schemaVersion: 1, places: places.map(p => ({
    id: String(p.id), aliases: (p.legacyIds || []).map(String), slug: p.slug,
    name: p.name, directoryTypes: locationTypes(p), types: [...new Set([...locationTypes(p),
      ...(p.capabilities?.includes('service') ? ['Service Center'] : [])])],
    city: p.city || '', region: p.state || '', country: p.country || '',
    address: p.displayAddress || p.address || null,
    latitude: p.lat ?? null, longitude: p.lng ?? null,
    coordinatePrecision: p.coordinatePrecision || 'unknown',
    status: p.status || 'unknown', listed: p.listed !== false,
    hours: p.hours || null, serviceHours: p.serviceHours || null,
    sourceURL: p.sourceUrl || null, checkedOn: p.lastVerified || null,
    chargerCount: p.chargerCount ?? null, maxKw: p.maxKw ?? null,
    photo: photoFor(p),
    reliability: locationReliability(p),
    bookingURL: safeUrl(p.bookingUrl, 'rivian.com'), phone: p.phone || null,
    information: informationFor(p),
    postalCode: p.postalCode || null,
    ...(p.permit ? { permit: { stage: p.permit.stage, stageLabel: p.permit.stageLabel, address: p.permit.address, reportedOn: p.permit.reportedOn, sourceURL: p.permit.sourceUrl, sourceName: p.permit.sourceName }, planningSource: p.planningSource } : {}),
    relatedPlaceIDs: [...new Set([...(p.chargingStations || []), ...(p.nearbyPlaces || [])].map(x => String(x.id)))]
  })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) };
  return output;
}
const manifestPath = path.join(root, 'data/catalog-revision.json');
// Local builds record a new revision for changed content. In CI the committed manifest must
// already match, so every deploy of unchanged data publishes identical bytes. The scheduled
// refresh, which commits the manifest it produces, opts in with CATALOG_REVISION_UPDATE=1.
const mayUpdateRevision = () => !process.env.CI || process.env.CATALOG_REVISION_UPDATE === '1';
function catalog({ updateRevision = mayUpdateRevision() } = {}) {
  const output = catalogContent();
  return { ...output, revision: require('./catalog-revision.cjs').revisionFor(output, manifestPath,
    Date.now(), { update: updateRevision }) };
}
function writeCatalog(target, { pretty = false, updateRevision } = {}) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const output = catalog({ updateRevision });
  const ids = output.places.map(p => p.id);
  if (!ids.length || ids.some(id => !id) || new Set(ids).size !== ids.length) throw Error('Invalid catalog identities');
  fs.writeFileSync(target, JSON.stringify(output, null, pretty ? 2 : undefined) + '\n');
  return output;
}
if (require.main === module) {
  const output = writeCatalog(path.join(root, 'ios/Sources/SpotterCore/Resources/catalog.json'), { pretty: true });
  console.log(`Exported ${output.places.length} places for iOS.`);
}
module.exports = { catalog, catalogContent, writeCatalog, manifestPath };
