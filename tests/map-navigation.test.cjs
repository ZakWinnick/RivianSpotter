const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/location-model.js');
function harness(reduce=false){
 let camera={center:[-98,39],zoom:3.4,bearing:0,pitch:0},flights=[];
 class Map{
  addControl(){} on(){} remove(){} stop(){}
  getCenter(){return{toArray:()=>camera.center.slice()};}getZoom(){return camera.zoom;}
  getBearing(){return camera.bearing;}getPitch(){return camera.pitch;}
  flyTo(next){flights.push(next);camera={...camera,...next};}
 }
 const ctx={window:{RivianSpotterConfig:{mapboxToken:'test'}},RivianSpotterConfig:{mapboxToken:'test'},LocationModel:M,mapboxgl:{Map,NavigationControl:class{},ScaleControl:class{}},document:{documentElement:{dataset:{}},getElementById:()=>({}),addEventListener(){}},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:reduce}),innerWidth:1280};
 ctx.window.mapboxgl=ctx.mapboxgl;
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/map.js'),'utf8'),ctx);
 const api=ctx.window.SpotterMap;api.init();
 return{api,flights,get camera(){return camera;}};
}
const p={id:1,lat:37,lng:-122,coordinatePrecision:'exact'};
test('closing detail restores browse camera even after switching locations',()=>{
 const h=harness();h.api.focus(p);assert.equal(h.camera.zoom,12);
 h.api.focus({...p,id:2,lat:34});h.api.clearFocus();
 assert.equal(h.camera.zoom,3.4);assert.deepEqual(Array.from(h.camera.center),[-98,39]);
 const n=h.flights.length;h.api.clearFocus();assert.equal(h.flights.length,n);
});
test('closing an unmapped location preserves view and reduced motion skips animation',()=>{
 const h=harness(true);h.api.focus({...p,lat:null,coordinatePrecision:'unknown'});h.api.clearFocus();assert.equal(h.flights.length,0);
 h.api.focus(p);h.api.clearFocus();assert(h.flights.every(x=>x.duration===0));
});
