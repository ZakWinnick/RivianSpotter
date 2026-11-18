'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../js/location-model.js'),U=require('../js/components.js');
const views=require('../js/dynamic-views.js')(M,U,null);
test('classifies current and legacy index routes consistently',()=>{
 assert.deepEqual(views.classify('/locations/darien/index.html'),{kind:'location',slug:'darien'});
 assert.deepEqual(views.classify('/regions/ca/index.html'),{kind:'region',state:'CA'});
 assert.equal(views.classify('/changelog.html').kind,'changelog');
});
test('browser gallery is generated from current records with escaped source data',()=>{
 const html=views.gallery([{id:1,name:'<script>alert(1)</script>',city:'A',state:'CA',type:'Space',slug:'a',services:[]}]);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert'));
});
test('design build no longer invokes the data-generated page builder',()=>{
 const build=fs.readFileSync(require.resolve('../build.js'),'utf8');
 assert.doesNotMatch(build,/require\(["']\.\/scripts\/build-pages\.cjs/);
 assert.doesNotMatch(build,/\bbuildPages\s*\(/);
});
