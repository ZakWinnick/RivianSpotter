const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {compare} = require('../scripts/location-digest.cjs');
const {publicEntry} = require('../scripts/update-location-feed.cjs');

test('changing the site domain does not create location announcements', () => {
  const before = {id:'1',name:'A Space',type:'Space',listed:true,fields:{'Location status':'open'},url:'https://rivianspotter.com/locations/a-space/'};
  const after = {...before,url:'https://rivspotter.com/locations/a-space/'};
  assert.deepEqual(compare([before],[after]),[]);
  const removal = compare([before],[])[0];
  assert.equal(publicEntry(removal).url,'/locations/a-space/');
  assert.throws(()=>publicEntry({...removal,url:'https://rivspotter.com.evil.test/locations/a-space/'}));
});

test('the renamed app preserves its install identity and private journal stores', () => {
  const read = p => fs.readFileSync('ios/'+p,'utf8');
  const project = read('RivianSpotter.xcodeproj/project.pbxproj');
  assert.match(project,/CFBundleDisplayName = "RivSpotter"/);
  assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER = com\.rivianspotter\.app;/);
  assert.match(read('Sources/SpotterCore/SharedStore.swift'),/group\.com\.rivianspotter\.app/);
  assert.match(read('Sources/SpotterCore/SharedStore.swift'),/appendingPathComponent\("RivianSpotter"/);
  assert.match(read('Sources/SpotterCore/CloudJournalStorage.swift'),/iCloud\.com\.rivianspotter\.app/);
  assert.match(read('Sources/SpotterApp/SpotterApp.swift'),/let storageName = "RivianSpotter"/);
  assert.match(read('AppInfo.plist'),/<string>rivspotter<\/string>/);
  assert.match(read('AppInfo.plist'),/<string>rivianspotter<\/string>/);
});
