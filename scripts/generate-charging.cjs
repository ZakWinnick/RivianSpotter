const fs = require('node:fs');
const path = require('node:path');
function render(records) {
  return '// Generated from data/charging.json. Refresh with npm run refresh:charging.\nconst rivianChargingLocations = ' + JSON.stringify(records) + ';\nif (typeof module !== "undefined" && module.exports) module.exports = rivianChargingLocations;\n';
}
function generate(root = path.resolve(__dirname, '..')) {
  const records = JSON.parse(fs.readFileSync(path.join(root, 'data/charging.json'), 'utf8'));
  const content = render(records), file = path.join(root, 'js/charging.js');
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) fs.writeFileSync(file, content);
  return records;
}
if (require.main === module) generate();
module.exports = {generate,render};
