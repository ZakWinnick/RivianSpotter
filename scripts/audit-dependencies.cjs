#!/usr/bin/env node
'use strict';
// `npm audit` exits 1 both for vulnerabilities and when npm's audit service is down. Vulnerabilities
// always fail; a service outage (after retries) only warns, so it can't block a release on its own.
const { spawnSync } = require('node:child_process');

function classify(stdout) {
  let report;
  try { report = JSON.parse(stdout); } catch { return { kind: 'unavailable', detail: 'Unreadable audit response' }; }
  if (report.error) return { kind: 'unavailable', detail: report.error.summary || report.error.code || 'Audit service error' };
  const counts = report.metadata?.vulnerabilities;
  if (!counts) return { kind: 'unavailable', detail: 'Audit response had no vulnerability counts' };
  const total = Object.entries(counts).filter(([level]) => level !== 'total').reduce((sum, [, n]) => sum + n, 0);
  return total ? { kind: 'vulnerable', detail: `${total} vulnerable production ${total === 1 ? 'dependency' : 'dependencies'}` } : { kind: 'clean' };
}

function main() {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const run = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
    last = classify(run.stdout);
    if (last.kind === 'clean') { console.log('No known vulnerabilities in production dependencies.'); return; }
    if (last.kind === 'vulnerable') {
      spawnSync('npm', ['audit', '--omit=dev'], { stdio: 'inherit' });
      console.error(`::error title=Dependency audit::${last.detail}`);
      process.exitCode = 1;
      return;
    }
    if (attempt < 3) spawnSync('sleep', [String(attempt * 20)]);
  }
  console.log(`::warning title=Dependency audit skipped::npm's audit service was unavailable (${last.detail}). Production dependencies were not re-audited on this run.`);
}

if (require.main === module) main();
module.exports = { classify };
