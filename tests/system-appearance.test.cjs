const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const UI=require('../js/components.js');
test('system appearance ignores former overrides and follows live changes for the map',()=>{
 for(const initial of [false,true]){
  const events=[],dataset={};let change;
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/components.js'),'utf8'),{
   document:{querySelector:()=>null,documentElement:{dataset},dispatchEvent:e=>events.push(e)},
   matchMedia:query=>{assert.equal(query,'(prefers-color-scheme: dark)');return {matches:initial,addEventListener:(type,fn)=>{assert.equal(type,'change');change=fn;}};},
   localStorage:{getItem:()=>{throw Error('Old overrides must not be read');},setItem:()=>{throw Error('System appearance must not be persisted');}},
   CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},navigator:{}
  });
  assert.equal(dataset.theme,initial?'dark':'light');
  change({matches:!initial});assert.equal(dataset.theme,initial?'light':'dark');
  assert.equal(events.at(-1).type,'themechange');assert.equal(events.at(-1).detail,dataset.theme);
 }
});
test('shared header has no appearance switch',()=>{
 assert.doesNotMatch(UI.header(),/theme-toggle|Switch to .* theme|aria-pressed/);
});
