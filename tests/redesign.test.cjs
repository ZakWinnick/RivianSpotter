const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { buildPages } = require('../scripts/build-pages.cjs');
const U = require('../js/components.js');

const place = (slug, type, extra = {}) => ({ id: slug.length * 101, slug, name: slug, type, city: 'Town', state: 'CA', country: 'US', address: '1 Main St', lat: 34, lng: -118, coordinatePrecision: 'exact', status: 'open', hours: 'Mon-Sun: 9am-5pm', sourceKind: 'directory', ...extra });

test('header carries the app tabs with the map as home', () => {
  const html = U.header('Map');
  for (const [name, href] of [['Locations', '/locations/'], ['Map', '/'], ['Saved', '/saved.html'], ['Browse', '/regions/']])
    assert.match(html, new RegExp(`href="${href.replace(/[.]/g, '\\.')}"[^>]*>.*?<span>${name}</span>`));
  assert.match(html, /href="\/"\s+aria-current="page"/);
  assert.doesNotMatch(html, /iPhone app/);
  assert.match(U.header('Explore'), /href="\/"\s+aria-current="page"/, 'old page names still mark the map tab');
});

test('gallery and browse pages list every listed place and type', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-redesign-'));
  try {
    buildPages(dir, [place('alpha-space', 'Space'), place('bravo-outpost', 'Outpost'), place('gone', 'Space', { listed: false })]);
    const gallery = fs.readFileSync(path.join(dir, 'locations/index.html'), 'utf8');
    assert.equal((gallery.match(/class="gallery-card /g) || []).length, 2);
    assert.match(gallery, /2 places across North America/);
    assert.match(gallery, /src="\/js\/gallery\.js"/);
    const browse = fs.readFileSync(path.join(dir, 'regions/index.html'), 'utf8');
    assert.match(browse, /<h1>Browse<\/h1>/);
    assert.match(browse, /href="\/\?type=Outpost"/);
    assert.match(browse, /href="\/regions\/ca\/"/);
    assert.doesNotMatch(browse + gallery, /class="eyebrow"/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
