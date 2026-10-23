'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const M = require('../js/location-model.js');
const U = require('../js/components.js');
const { informationFor } = require('../scripts/ios-place-information.cjs');
const api = () => import('../scripts/refresh-coming-soon.mjs');
const permits = () => import('../scripts/permit-sites.mjs');

const site = (overrides = {}) => ({ city: 'Bozeman', state: 'MT', address: '100 Main St', stage: 'permit-filed', reportedOn: '2026-10-20',
  sourceUrl: 'https://x.com/rantracker/status/1', lat: 45.68, lng: -111.04, coordinateSource: 'test geocode', sourceName: 'RAN Tracker',
  sourceProfile: 'https://x.com/rantracker', ...overrides });
const announcement = { city: 'Bozeman', state: 'MT', latitude: 45.67, longitude: -111.05 };

test('the permit file is validated before anything is published', async () => {
  const { validatePermitSites } = await permits();
  const file = s => ({ schemaVersion: 1, source: { name: 'RAN Tracker', url: 'https://x.com/rantracker' }, sites: [s] });
  assert.doesNotThrow(() => validatePermitSites(file(site())));
  for (const bad of [site({ stage: 'rumored' }), site({ sourceUrl: 'https://example.com/post' }), site({ lat: undefined }),
    site({ address: ' ' }), site({ state: 'XX' }), site({ reportedOn: 'Oct 20' })]) assert.throws(() => validatePermitSites(file(bad)));
  assert.throws(() => validatePermitSites({ ...file(site()), sites: [site(), site()] }), /Duplicate/);
  assert.equal(require('../data/permit-sites.json').schemaVersion, 1);
});

test('a permit for an announced city pins the announcement at the permit address', async () => {
  const { mergePlanned } = await api();
  const [p] = mergePlanned([], [announcement], '2026-10-23', [], {}, { permits: [site()] });
  assert.equal(p.planningSource, 'rivian-coming-soon');
  assert.equal(p.coordinatePrecision, 'permit-address');
  assert.deepEqual([p.lat, p.lng], [45.68, -111.04]);
  assert.equal(p.permit.stageLabel, 'Permit filed');
  assert.equal(p.permit.sourceUrl, 'https://x.com/rantracker/status/1');
  assert.ok(M.isMapped(p));
  assert.equal(M.getDirectionsUrl(p), null);
  assert.equal(M.chargingSummary(p), 'Coming Soon · Permit filed');
});

test('a permit Rivian hasn’t announced is listed on its own and keeps its identity once announced', async () => {
  const { mergePlanned } = await api();
  const [permitOnly] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site()] });
  assert.equal(permitOnly.planningSource, 'permit-filing');
  assert.equal(permitOnly.status, 'planned');
  assert.match(permitOnly.sourceId, /^PERMIT-MT-bozeman-/);
  const html = U.chargingDetails(permitOnly);
  assert.match(html, /Coming Soon · Permit filed/);
  assert.match(html, /hasn’t announced Bozeman, MT/);
  assert.match(html, /100 Main St/);
  assert.match(html, /https:\/\/x\.com\/rantracker\/status\/1/);
  // Rivian later announces the city: one record, same ID and link, now an announcement.
  const later = mergePlanned([], [announcement], '2026-11-01', [permitOnly], {}, { permits: [site()] });
  assert.equal(later.length, 1);
  assert.equal(later[0].id, permitOnly.id);
  assert.equal(later[0].slug, permitOnly.slug);
  assert.equal(later[0].planningSource, 'rivian-coming-soon');
  assert.equal(later[0].firstSeen, '2026-10-23');
});

test('two filings in one announced city stay separate and leave the announcement generic', async () => {
  const { mergePlanned } = await api();
  const merged = mergePlanned([], [announcement], '2026-10-23', [], {}, { permits: [site(), site({ address: '9 Oak Ave', sourceUrl: 'https://x.com/rantracker/status/2' })] });
  assert.equal(merged.length, 3);
  assert.equal(merged.find(p => p.planningSource === 'rivian-coming-soon').permit, undefined);
  assert.equal(merged.filter(p => p.planningSource === 'permit-filing').length, 2);
});

test('a permit-only site is promoted when its station opens, and drops out if removed from the file', async () => {
  const { mergePlanned } = await api();
  const [permitOnly] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site()] });
  const station = { ...permitOnly, id: 9, slug: 'ran-bozeman-station', sourceId: 'US-RIV-L9', planningSource: undefined, permit: undefined, status: 'unknown',
    address: '100 Main St, Bozeman, MT', coordinatePrecision: 'map-pin', chargerCount: 6, maxKw: 300, firstSeen: '2026-12-01' };
  const report = {}, [opened] = mergePlanned([station], [], '2026-12-01', [permitOnly], report, { permits: [site()] });
  assert.equal(opened.id, permitOnly.id);
  assert.equal(opened.sourceId, 'US-RIV-L9');
  assert.equal(report.promoted.length, 1);
  const removed = mergePlanned([], [], '2026-10-24', [permitOnly], {}, { permits: [] }).find(p => p.id === permitOnly.id);
  assert.equal(removed.listed, false);
});

test('the app gets the permit facts, source link, and pin', async () => {
  const { mergePlanned } = await api();
  const [p] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site()] });
  const [section] = informationFor(p);
  assert.equal(section.title, 'Site status');
  assert.equal(section.sourceURL, 'https://x.com/rantracker/status/1');
  assert.deepEqual(section.facts.find(f => f.title === 'Status'), { title: 'Status', value: 'Permit filed' });
  assert.deepEqual(section.facts.find(f => f.title === 'Address'), { title: 'Address', value: '100 Main St' });
});

test('adding a permit site through the helper validates and replaces the same address', async () => {
  const { upsertSite } = await import('../scripts/add-permit-site.mjs');
  const empty = { schemaVersion: 1, source: { name: 'RAN Tracker', url: 'https://x.com/rantracker' }, sites: [] };
  const { sourceName, sourceProfile, ...entry } = site();
  const once = upsertSite(empty, entry);
  const twice = upsertSite(once, { ...entry, stage: 'permit-approved' });
  assert.equal(twice.sites.length, 1);
  assert.equal(twice.sites[0].stage, 'permit-approved');
  assert.throws(() => upsertSite(empty, { ...entry, stage: 'rumored' }));
});

test('old reports read as no recent update, and reported-open sites say Rivian doesn’t list them', async () => {
  const { mergePlanned } = await api();
  const [old] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site({ reportedOn: '2023-06-07' })] });
  assert.equal(old.permit.stalled, true);
  assert.equal(M.permitLabel(old), 'Permit filed · No update since Jun 2023');
  assert.match(U.chargingDetails(old), /No update since June 7, 2023/);
  const [recent] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site({ reportedOn: '2026-01-01' })] });
  assert.equal(recent.permit.stalled, undefined);
  const [open] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site({ stage: 'reported-open', reportedOn: '2026-05-08' })] });
  assert.equal(M.permitLabel(open), 'Reported open · Not on Rivian’s map');
  assert.match(U.chargingDetails(open), /Rivian’s charging map doesn’t list it/);
  const [named] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site({ siteName: 'Palisades Village', addressNote: 'main address of Palisades Village' })] });
  assert.match(U.chargingDetails(named), /Palisades Village[\s\S]*main address of Palisades Village/);
});

test('funding-awarded sites explain NEVI funding, and map-only sites cite the tracker’s map', async () => {
  const { mergePlanned } = await api(), { validatePermitSites } = await permits();
  const mapUrl = 'https://www.google.com/maps/d/viewer?mid=example';
  const file = s => ({ schemaVersion: 1, source: { name: 'RAN Tracker', url: 'https://x.com/rantracker', mapUrl }, sites: [s] });
  assert.doesNotThrow(() => validatePermitSites(file(site({ stage: 'funding-awarded', sourceUrl: mapUrl }))));
  assert.throws(() => validatePermitSites({ ...file(site()), source: { name: 'RAN Tracker', url: 'https://x.com/rantracker', mapUrl: 'https://example.com/map' } }));
  const [p] = mergePlanned([], [], '2026-10-23', [], {}, { permits: [site({ stage: 'funding-awarded', sourceUrl: mapUrl, fromMap: true })] });
  assert.equal(M.permitLabel(p), 'Coming Soon · Funding awarded');
  const html = U.chargingDetails(p);
  assert.match(html, /NEVI/);
  assert.match(html, /RAN Tracker’s map/);
});
