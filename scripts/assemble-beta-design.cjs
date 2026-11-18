'use strict';
const fs=require('node:fs'),path=require('node:path');
const {buildSnapshot}=require('./beta-data-snapshot.cjs');
const {validatedRelease,rewriteHtml,writeReleaseAssets}=require('./beta-release-assets.cjs');
function rewriteHtmlTree(dir,sha){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){if(entry.name!=='beta-releases')rewriteHtmlTree(file,sha);}
    else if(entry.name.endsWith('.html'))fs.writeFileSync(file,rewriteHtml(fs.readFileSync(file,'utf8'),sha));
  }
}
function assemble({oldDist,newDist,output,oldSha,newSha}) {
  validatedRelease(oldSha);validatedRelease(newSha);
  if(fs.existsSync(output))throw Error('Output already exists');
  const oldSnapshot=path.join(output,'old-data'),newSnapshot=path.join(output,'new-data');
  const oldInfo=buildSnapshot(oldDist,oldSnapshot,{shellRelease:oldSha,designSha:oldSha});
  const newInfo=buildSnapshot(newDist,newSnapshot,{shellRelease:newSha,designSha:newSha});
  if(oldInfo.catalogRevision!==newInfo.catalogRevision)throw Error('Design builds use different catalog revisions');
  const oldCatalog=fs.readFileSync(path.join(oldSnapshot,'files/api/v1/catalog.json'));
  const newCatalog=fs.readFileSync(path.join(newSnapshot,'files/api/v1/catalog.json'));
  if(!oldCatalog.equals(newCatalog))throw Error('Design builds use different catalog data');
  for(const [name,dist,sha] of [['old-shell',oldDist,oldSha],['new-shell',newDist,newSha]]){
    const target=path.join(output,name);fs.cpSync(dist,target,{recursive:true});
    rewriteHtmlTree(target,sha);
    writeReleaseAssets(oldDist,path.join(oldSnapshot,'files/js/app.js'),target,oldSha);
    writeReleaseAssets(newDist,path.join(newSnapshot,'files/js/app.js'),target,newSha);
    fs.writeFileSync(path.join(target,'beta-release.json'),JSON.stringify({schemaVersion:1,designSha:sha})+'\n');
  }
  return {oldSha,newSha,catalogRevision:oldInfo.catalogRevision,oldSnapshot:oldInfo.snapshot,newSnapshot:newInfo.snapshot};
}
if(require.main===module){try{console.log(JSON.stringify(assemble({oldDist:process.argv[2],newDist:process.argv[3],output:process.argv[4],oldSha:process.env.BETA_OLD_SHA,newSha:process.env.BETA_NEW_SHA})));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={assemble};
