const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Persist the revision beside the source data, so website and bundled exports agree.
// Source verification dates are deliberately not used to order catalog releases.
function revisionFor(content, file, now = Date.now()) {
  const digest = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (previous && (!Number.isSafeInteger(previous.revision) || previous.revision <= 0 ||
      !/^[a-f0-9]{64}$/.test(previous.digest))) throw Error('Invalid catalog revision manifest');
  if (previous?.digest === digest) return previous.revision;
  const revision = Math.max(now, (previous?.revision || 0) + 1);
  if (!Number.isSafeInteger(revision) || revision <= 0) throw Error('Invalid catalog revision');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ revision, digest }, null, 2) + '\n');
  fs.renameSync(temporary, file);
  return revision;
}

module.exports = { revisionFor };
