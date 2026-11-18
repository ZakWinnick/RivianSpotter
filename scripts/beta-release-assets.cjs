'use strict';
const fs=require('node:fs'),path=require('node:path');
function validatedRelease(sha){if(typeof sha!=='string'||!/^[a-f0-9]{40}$/.test(sha))throw Error('A full lowercase beta design commit is required');return sha;}
function resolveDesign({requested,head,published}){
  validatedRelease(head);
  if(requested){validatedRelease(requested);if(requested!==head)throw Error('Requested design is no longer beta-main head');return requested;}
  return validatedRelease(published);
}
function rewriteHtml(html,sha){
  validatedRelease(sha);
  return html.replace(/((?:src|href)=")\/(css|js|vendor|assets|images)\/([^"?#]+)(?:\?[^"#]*)?"/g,(whole,start,dir,name)=>{
    if(dir==='js' && ['locations.js','charging.js','roamer.js'].includes(name))return whole;
    return `${start}/beta-releases/${sha}/${dir}/${name}"`;
  });
}
function rewriteCss(css,sha){validatedRelease(sha);return css.replace(/(url\(\s*['"]?)\/(assets|images|vendor)\//g,`$1/beta-releases/${sha}/$2/`);}
function rewriteWorker(text,sha){
  validatedRelease(sha);
  const start=text.indexOf('const STATIC_ASSETS = ['),end=text.indexOf('];',start);
  if(start<0||end<0)throw Error('Unsupported beta worker');
  const head=text.slice(start,end).replace(/'\/(css|js|assets|images|vendor)\/([^']+)'/g,(whole,dir,name)=>{
    if(dir==='js'&&['locations.js','charging.js','roamer.js'].includes(name))return whole;
    return `'\u002fbeta-releases/${sha}/${dir}/${name}'`;
  });
  text=text.slice(0,start)+head+text.slice(end);
  if(!text.includes('STATIC_ASSETS.includes(url.pathname)'))throw Error('Unsupported beta worker asset policy');
  text=text.replace('STATIC_ASSETS.includes(url.pathname)',"STATIC_ASSETS.includes(url.pathname) || /^\\/beta-releases\\/[a-f0-9]{40}\\/(?:css|js|vendor|assets|images)\\/[A-Za-z0-9_./-]+$/.test(url.pathname)");
  return text.replace(/const RELEASE = '[^']+';/,`const RELEASE = '${sha}';`);
}
function writeReleaseAssets(dist,patchedApp,shell,sha){
  validatedRelease(sha);
  const target=path.join(shell,'beta-releases',sha);
  for(const directory of ['css','js','vendor','assets','images']) {
    const source=path.join(dist,directory);
    if(fs.existsSync(source))fs.cpSync(source,path.join(target,directory),{recursive:true});
  }
  fs.copyFileSync(patchedApp,path.join(target,'js','app.js'));
  const styles=path.join(target,'css');
  if(fs.existsSync(styles))for(const name of fs.readdirSync(styles))if(name.endsWith('.css')){const file=path.join(styles,name);fs.writeFileSync(file,rewriteCss(fs.readFileSync(file,'utf8'),sha));}
}
module.exports={validatedRelease,resolveDesign,rewriteHtml,rewriteCss,rewriteWorker,writeReleaseAssets};
