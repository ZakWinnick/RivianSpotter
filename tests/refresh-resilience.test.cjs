'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const api = require('../scripts/refresh-locations.cjs');
const { classify } = require('../scripts/audit-dependencies.cjs');
const { collectWarnings, unmatchedRoamerStations, issueBody } = require('../scripts/report-refresh-warnings.cjs');
const load = file => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8'));

test('an unreadable detail page keeps that location’s last published record and date', () => {
  const summary = load('refresh-summary.json'), canonical = load('locations.json');
  const [raw] = summary.officialDirectory;
  const prior = canonical.find(p => p.slug === raw.slug);
  const failures = [{ slug: raw.slug, url: raw.sourceUrl, error: 'Invalid official Flight data' }];
  const [kept] = api.officialRecords([raw], new Map(), [], '2099-01-01', canonical, failures);
  assert.equal(kept.lastVerified, prior.lastVerified);
  assert.equal(kept.lat, prior.lat);
  assert.deepEqual(kept.capabilities, prior.capabilities);
  assert.deepEqual(kept.retainedDetail, { since: prior.lastVerified, reason: 'Invalid official Flight data' });
  // A second failure keeps counting from the first date the page was missed.
  const [again] = api.officialRecords([raw], new Map(), [], '2099-01-02', [kept], failures);
  assert.equal(again.retainedDetail.since, prior.lastVerified);
});

test('a new location whose detail page fails shows directory facts only, flagged for review', () => {
  const [raw] = load('refresh-summary.json').officialDirectory;
  const [record] = api.officialRecords([{ ...raw, slug: 'brand-new-space' }], new Map(), [], '2099-01-01', [], []);
  assert.equal(record.lastVerified, '2099-01-01');
  assert.equal(record.coordinatePrecision, 'unknown');
  assert.equal(record.verificationStatus, 'needs-review');
  assert.ok(record.notes.some(n => /detail page could not be read/.test(n)));
});

test('only a handful of detail failures are tolerated before the run stops', () => {
  assert.equal(api.maxDetailFailures(20), 3);
  assert.equal(api.maxDetailFailures(66), 7);
});

test('the service map falls back to another complete copy, never a partial one', () => {
  const full = { features: Array.from({ length: 120 }, () => ({})) }, partial = { features: [{}] };
  assert.equal(api.serviceMapSource(new Map([['calgary-service-demo-center', full], ['other', full]])).slug, 'calgary-service-demo-center');
  assert.equal(api.serviceMapSource(new Map([['calgary-service-demo-center', partial], ['other', full]])).slug, 'other');
  assert.equal(api.serviceMapSource(new Map([['calgary-service-demo-center', partial]])), null);
});

test('an unreadable coming-soon layer keeps the announced cities and their dates', async () => {
  const { retainedComingSoonRows, mergePlanned } = await import('../scripts/refresh-coming-soon.mjs');
  const prior = load('charging.json');
  const announced = prior.filter(p => p.planningSource === 'rivian-coming-soon' && p.status === 'planned' && p.listed !== false && !p.promotion);
  const rows = retainedComingSoonRows(prior);
  assert.equal(rows.length, announced.length);
  const active = prior.filter(p => p.status !== 'planned' && p.listed !== false);
  const merged = mergePlanned(active, rows, '2099-01-01', prior, {}, { retained: true });
  for (const old of announced) {
    const kept = merged.find(p => p.sourceId === old.sourceId);
    assert.equal(kept.status, 'planned');
    assert.equal(kept.listed, true);
    assert.equal(kept.lastVerified, old.lastVerified);
    assert.equal(kept.id, old.id);
  }
});

test('dependency audit fails on vulnerabilities but not when npm’s service is down', () => {
  assert.equal(classify(JSON.stringify({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } })).kind, 'clean');
  assert.equal(classify(JSON.stringify({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 0, critical: 0, total: 1 } } })).kind, 'vulnerable');
  assert.equal(classify(JSON.stringify({ error: { code: 'ENOAUDIT', summary: 'Service Unavailable' } })).kind, 'unavailable');
  assert.equal(classify('').kind, 'unavailable');
});

test('refresh warnings are gathered from both summaries and listed in the issue', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-warnings-'));
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'refresh-summary.json'), JSON.stringify({ warnings: ['Kept A'] }));
  fs.writeFileSync(path.join(dir, 'data', 'charging-summary.json'), JSON.stringify({}));
  const warnings = collectWarnings(dir);
  assert.deepEqual(warnings, ['Kept A']);
  assert.match(issueBody(warnings, 'https://example.test/run'), /- Kept A[\s\S]*Run: https:\/\/example.test\/run/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a Roamer station missing from the official map is flagged, matched ones are not', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-roamer-'));
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'charging.json'), JSON.stringify([{ sourceId: 'US-RIV-A', listed: true }, { sourceId: 'US-RIV-B', listed: false }]));
  fs.writeFileSync(path.join(dir, 'data', 'roamer.json'), JSON.stringify({ stations: [
    { sourceId: 'US-RIV-A', name: 'Matched', networkListed: true },
    { sourceId: 'US-RIV-B', name: 'Delisted officially', networkListed: true, reportedStatus: 'Operational' },
    { sourceId: 'US-RIV-C', name: 'Jackson, WY', networkListed: true, reportedStatus: 'Operational' },
    { sourceId: 'US-RIV-D', name: 'Gone from Roamer', networkListed: false },
  ] }));
  const flagged = unmatchedRoamerStations(dir);
  assert.equal(flagged.length, 2);
  assert.match(flagged.join('\n'), /Jackson, WY \(US-RIV-C\) as operational/);
  assert.doesNotMatch(flagged.join('\n'), /Matched|Gone from Roamer/);
  fs.rmSync(dir, { recursive: true, force: true });
});
