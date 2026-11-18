'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {assemble}=require('../scripts/assemble-beta-design.cjs');
test('coordinated releases keep both generations of shell assets with matching data pages',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'riv-beta-release-')),old='a'.repeat(40),next='b'.repeat(40);
  function put(base,name,value){const f=path.join(base,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,value);}
  function design(dir,label){
    put(dir,'api/v1/catalog.json',JSON.stringify({schemaVersion:1,revision:7,places:[{id:'1'}]}));
    put(dir,'data/locations.json','[]');put(dir,'data/charging.json','[]');put(dir,'data/roamer.json','{"stations":[]}');
    for(const f of ['locations/index.html','regions/index.html','updates.html','stats.html','index.html'])put(dir,f,'<link href="/css/style.css?v=old"><script src="/js/app.js?v=old"></script>');
    put(dir,'sitemap.xml','<urlset/>');put(dir,'service-worker.js',"const RELEASE = 'old';\nconst STATIC_ASSETS = ['/css/style.css','/js/app.js','/js/locations.js'];\nconst PUBLIC_DATA = new Set(['/data/locations.json']);\nif (STATIC_ASSETS.includes(url.pathname)) {}");
    put(dir,'js/app.js','  async function load() {\n    try { /* old */\n    all = M.combineLocations(all, chargers, roamer);\n}');
    for(const f of ['locations','charging','roamer'])put(dir,`js/${f}.js`,'data');
    put(dir,'css/style.css',label);put(dir,'vendor/mapbox-gl.js','vendor');put(dir,'assets/logo.png','logo');
  }
  try{
    const a=path.join(temp,'a'),b=path.join(temp,'b'),out=path.join(temp,'out');design(a,'old style');design(b,'new style');
    assemble({oldDist:a,newDist:b,output:out,oldSha:old,newSha:next});
    for(const shell of ['old-shell','new-shell']){
      assert.equal(fs.readFileSync(path.join(out,shell,'beta-releases',old,'css/style.css'),'utf8'),'old style');
      assert.equal(fs.readFileSync(path.join(out,shell,'beta-releases',next,'css/style.css'),'utf8'),'new style');
    }
    for(const [stage,sha] of [['old',old],['new',next]]){
      const page=fs.readFileSync(path.join(out,`${stage}-data/files/locations/index.html`),'utf8');
      assert.ok(page.includes(`/beta-releases/${sha}/css/style.css`));
      assert.ok(page.includes(`/beta-releases/${sha}/js/app.js`));
      assert.ok(fs.readFileSync(path.join(out,`${stage}-data/files/service-worker.js`),'utf8').includes(`/beta-releases/${sha}/js/app.js`));
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
