const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/location-model.js');
function harness(reduce=false,width=1280){
 let camera={center:[-98,39],zoom:3.4,bearing:0,pitch:0},flights=[];
 class Map{
  addControl(){} on(){} remove(){} stop(){}
  getCenter(){return{toArray:()=>camera.center.slice()};}getZoom(){return camera.zoom;}
  getBearing(){return camera.bearing;}getPitch(){return camera.pitch;}
  flyTo(next){flights.push(next);camera={...camera,...next};}
 }
 const ctx={window:{RivianSpotterConfig:{mapboxToken:'test'}},RivianSpotterConfig:{mapboxToken:'test'},LocationModel:M,mapboxgl:{Map,NavigationControl:class{},ScaleControl:class{}},document:{documentElement:{dataset:{}},getElementById:()=>({}),addEventListener(){}},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:reduce}),innerWidth:width};
 ctx.window.mapboxgl=ctx.mapboxgl;
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/map.js'),'utf8'),ctx);
 const api=ctx.window.SpotterMap;api.init();
 return{api,flights,setCamera(next){camera={...camera,...next};},get camera(){return camera;}};
}
const p={id:1,lat:37,lng:-122,coordinatePrecision:'exact'};
test('closing detail returns to the full overview even after regional browsing and switching locations',()=>{
 const h=harness();h.setCamera({center:[-121,38],zoom:8,bearing:25,pitch:30});h.api.focus({...p,coordinatePrecision:"map-pin"});assert.equal(h.camera.zoom,12);assert.deepEqual(Array.from(h.camera.offset),[-202,0]);
 h.api.focus({...p,id:2,lat:34});h.api.clearFocus();
 assert.equal(h.camera.zoom,3.4);assert.equal(h.camera.bearing,0);assert.equal(h.camera.pitch,0);assert.deepEqual(Array.from(h.camera.center),[-98,39]);
 const n=h.flights.length;h.api.clearFocus();assert.equal(h.flights.length,n);
});
test('closing an unmapped location preserves view and reduced motion skips animation',()=>{
 const h=harness(true);h.api.focus({...p,lat:null,coordinatePrecision:'unknown'});h.api.clearFocus();assert.equal(h.flights.length,0);
 h.api.focus(p);h.api.clearFocus();assert(h.flights.every(x=>x.duration===0));
});

test("mobile close uses a wider overview and clears the detail offset",()=>{
 const h=harness(false,390);h.setCamera({zoom:9});h.api.focus({...p,coordinatePrecision:"map-pin"});assert.deepEqual(Array.from(h.camera.offset),[0,-180]);h.api.clearFocus();assert.equal(h.camera.zoom,2);assert.deepEqual(Array.from(h.camera.offset),[0,0]);
});
