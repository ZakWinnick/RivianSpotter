'use strict';
const pins = require('./listed-address-pins.json');
const identity = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Address lookups are reviewed and cached once, never requested by clients or scheduled jobs.
// If the published address changes, discard its old fallback until the new address is located.
function applyListedAddressPin(record, cache = pins) {
  if (valid(record.lat, record.lng)) return record;
  const pin = cache[record.slug];
  if (!record.address || !pin || !valid(pin.lat, pin.lng) ||
      !['address', 'city', 'state', 'country'].every(key => identity(record[key]) === identity(pin[key]))) return record;
  return { ...record, lat: pin.lat, lng: pin.lng, coordinatePrecision: 'map-pin',
    coordinateMethod: 'listed-address', coordinateSource: pin.source,
    verificationNote: 'Map pin located from the listed street address. Operating details retain their existing verification status.' };
}
module.exports = { applyListedAddressPin };
