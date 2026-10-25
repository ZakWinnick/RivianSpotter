'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../scripts/refresh-locations.cjs');

const raw = (address) => ({ slug: 'charlotte-service-demo-center', name: 'Charlotte, NC - Service + Demo Center', address,
  cityLine: 'Charlotte, NC 28270', publishedText: '(980) 342-1261\nWed–Sun: 9:00am-6:00pm\nService hours\nMon–Fri: 8:00am–5:00pm',
  sourceUrl: 'https://rivian.com/spaces/charlotte-service-demo-center' });
const detail = (streetAddress) => ({ faq: [], badges: ['Service appointments'], directionsUrl: null,
  business: { address: { streetAddress, addressRegion: 'NC' }, geo: { latitude: 35.1, longitude: -80.7 } } });
const feature = (address, phone = '+19803421261') => ({ geometry: { coordinates: [-80.738851, 35.1455517] },
  properties: { id: 'svc-charlotte', address, stateOrProvince: 'NC', city: 'Charlotte', postalCode: '28270', phone, status: 'live' } });

test('a mistyped directory street number defers to the detail page and service map when ZIP and phone agree', () => {
  const p = api.directoryRecord(raw('3909 Monroe Road'), detail('9309 Monroe Road'), [feature('9309 Monroe Road')], '2026-10-25');
  assert.equal(p.address, '9309 Monroe Road');
  assert.equal(p.listedAddress, '3909 Monroe Road');
  assert.equal(p.lat, 35.1455517);
  assert.equal(p.coordinatePrecision, 'exact');
  assert.equal(p.officialServiceId, 'svc-charlotte');
  assert.match(p.notes.join(' '), /directory lists 3909 Monroe Road; its detail page and service map both list 9309 Monroe Road/);
});

test('no correction without a matching phone number, so no coordinates are guessed', () => {
  const p = api.directoryRecord(raw('3909 Monroe Road'), detail('9309 Monroe Road'), [feature('9309 Monroe Road', '+15550000000')], '2026-10-25');
  assert.equal(p.address, '3909 Monroe Road');
  assert.equal(p.lat, null);
  assert.equal(p.coordinatePrecision, 'unknown');
});

test('the same address written two ways keeps the directory form and adds no correction note', () => {
  const p = api.directoryRecord(raw('2512 Hawes Ave'), detail('2512 Hawes'), [feature('2512 Hawes')], '2026-10-25');
  assert.equal(p.address, '2512 Hawes Ave');
  assert.equal(p.listedAddress, undefined);
  assert.equal(p.coordinatePrecision, 'exact');
  assert.doesNotMatch(p.notes.join(' '), /directory lists/);
});

test('merging a former duplicate keeps its ID and page address as aliases', () => {
  const record = { slug: 'charlotte-service-demo-center', state: 'NC', city: 'Charlotte', address: '9309 Monroe Road', officialServiceId: 'svc-charlotte', capabilities: ['see-vehicles', 'service'] };
  const legacy = [
    { id: 152, slug: 'charlotte-nc-9309-monroe-road-service-center', name: 'Charlotte - Service Center', type: 'Service Center', state: 'NC', address: '9309 Monroe Road', officialServiceId: 'svc-charlotte' },
    { id: 163, slug: 'charlotte-service-demo-center', name: 'Charlotte, NC - Service + Demo Center', type: 'Demo Center', state: 'NC', address: '3909 Monroe Road' },
  ];
  const { records } = api.reconcile([record], legacy, '2026-10-25');
  assert.equal(records.length, 1);
  assert.equal(records[0].id, 152);
  assert.deepEqual(records[0].legacyIds, [163]);
  assert.deepEqual(records[0].legacySlugs, ['charlotte-nc-9309-monroe-road-service-center']);
});
