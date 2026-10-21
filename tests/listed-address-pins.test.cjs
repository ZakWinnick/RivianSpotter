const test = require('node:test');
const assert = require('node:assert/strict');
const { applyListedAddressPin } = require('../scripts/listed-address-pins.cjs');
const { reconcile } = require('../scripts/refresh-locations.cjs');
const M = require('../js/location-model.js');
const pins = require('../scripts/listed-address-pins.json');
const record = { slug: 'example', address: '123 Main St', city: 'Town', state: 'CA', country: 'US',
  lat: null, lng: null, coordinatePrecision: 'unknown', status: 'unknown', verificationStatus: 'needs-review', hours: null };
const pin = { ...record, lat: 37.5, lng: -122.1, source: 'https://example.com/address' };

test('a listed address supplies a usable map pin without changing operating claims', () => {
  const result = applyListedAddressPin(record, { example: pin });
  assert(M.isMapped(result));
  assert.equal(result.coordinateMethod, 'listed-address');
  assert.equal(result.coordinateSource, pin.source);
  for (const key of ['status', 'verificationStatus', 'hours']) assert.equal(result[key], record[key]);
  assert.equal(record.lat, null);
});

test('address or locality changes invalidate the cached fallback', () => {
  for (const change of [{ address: '124 Main St' }, { address: '' }, { city: 'Other Town' },
    { state: 'NV' }, { country: 'CA' }, { slug: 'other' }]) {
    const changed = { ...record, ...change };
    assert.equal(applyListedAddressPin(changed, { example: pin }), changed);
  }
});

test('existing official coordinates take priority and invalid fallback coordinates are ignored', () => {
  const official = { ...record, lat: 37.6, lng: -122.2, coordinatePrecision: 'exact' };
  assert.equal(applyListedAddressPin(official, { example: pin }), official);
  for (const change of [{ lat: null }, { lat: NaN }, { lat: 100 }, { lng: -200 }]) {
    assert.equal(applyListedAddressPin(record, { example: { ...pin, ...change } }), record);
  }
});

test('scheduled reconciliation reapplies address pins to directory and legacy records', () => {
  const canonical = require('../data/locations.json');
  const directory = canonical.find(p => p.slug === 'alpharetta');
  const legacy = canonical.find(p => p.id === 59);
  const input = { ...directory, lat: null, lng: null, coordinatePrecision: 'unknown' };
  const output = reconcile([input], [directory, legacy], '2026-10-20').records;
  for (const p of output) {
    assert.equal(p.lat, pins[p.slug].lat);
    assert(M.isMapped(p));
  }
  const retained = output.find(p => p.id === 59);
  assert.equal(retained.status, 'unknown');
  assert.equal(retained.hours, null);
});

test('address-less listings are not assigned a guessed city pin', () => {
  for (const p of require('../data/locations.json').filter(p => !p.address)) {
    assert.equal(applyListedAddressPin(p).lat, null);
  }
});
