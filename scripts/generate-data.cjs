#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
function render(records){return '// Generated from data/locations.json. Edit canonical JSON and run npm run generate:data.\nconst rivianLocations = '+JSON.stringify(records,null,2)+';\nif (typeof module !== "undefined" && module.exports) module.exports = rivianLocations;\n';}
function generate(root=path.resolve(__dirname,'..')){const data=JSON.parse(fs.readFileSync(path.join(root,'data/locations.json'),'utf8'));const content=render(data);const target=path.join(root,'js/locations.js');if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)fs.writeFileSync(target,content);return data;}
if(require.main===module)generate();
module.exports={render,generate};
