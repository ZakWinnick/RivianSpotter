const fs=require('node:fs'),path=require('node:path');
function generate(root=path.resolve(__dirname,'..')){
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/roamer.json'),'utf8'));
 fs.writeFileSync(path.join(root,'js/roamer.js'),'// Generated public Roamer snapshot.\nconst rivianRoamerSnapshot = '+JSON.stringify(data).replace(/</g,'\\u003c')+';\n');
 return data;
}
module.exports={generate};
