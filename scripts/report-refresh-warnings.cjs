#!/usr/bin/env node
'use strict';
// After a successful daily refresh, surface anything that needs a person: a source that fell back
// to the last published data, or a Roamer station the official map doesn't list. The run still
// publishes, so GitHub sends no failure email; one open issue carries the warnings instead, and it
// closes itself after the next clean refresh.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const TITLE = 'Daily data refresh needs a look';

// Roamer stations are joined to Rivian's official map by exact source ID. A station Roamer reports
// that the official map doesn't list (yet) gets no page, so call it out rather than drop it quietly.
function unmatchedRoamerStations(root = ROOT) {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  const roamerFile = path.join(root, 'data', 'roamer.json');
  if (!fs.existsSync(roamerFile)) return [];
  const official = new Set(read('charging.json').filter(p => p.listed !== false).map(p => p.sourceId));
  return (read('roamer.json').stations || []).filter(s => s.networkListed !== false && !official.has(s.sourceId))
    .map(s => `Roamer reports ${s.name} (${s.sourceId}) as ${(s.reportedStatus || 'listed').toLowerCase()}, but Rivian’s official charging map doesn’t list it yet, so it has no page.`);
}

function collectWarnings(root = ROOT) {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  return [...(read('refresh-summary.json').warnings || []), ...(read('charging-summary.json').warnings || []),
    ...unmatchedRoamerStations(root)];
}

function issueBody(warnings, runUrl) {
  return [
    'The daily refresh published, but needs a look:',
    '',
    ...warnings.map(w => `- ${w}`),
    '',
    'Kept records show their original “last checked” date. A source that falls back on consecutive runs probably changed format and needs a parser update. A Roamer-only station usually appears on Rivian’s map within a day; if it doesn’t, check whether its ID changed.',
    runUrl ? `\nRun: ${runUrl}` : '',
  ].join('\n');
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function main() {
  const warnings = collectWarnings();
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, warnings.length
      ? `### Sources kept from the last release\n\n${warnings.map(w => `- ${w}`).join('\n')}\n`
      : 'All official sources were read on this refresh.\n');
  }
  for (const warning of warnings) console.log(`::warning title=Refresh needs a look::${warning}`);
  if (!process.env.GH_TOKEN) return;
  const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--search', `"${TITLE}" in:title`, '--json', 'number,title']))
    .find(issue => issue.title === TITLE);
  if (warnings.length && open) gh(['issue', 'comment', String(open.number), '--body', issueBody(warnings, runUrl)]);
  else if (warnings.length) gh(['issue', 'create', '--title', TITLE, '--body', issueBody(warnings, runUrl)]);
  else if (open) gh(['issue', 'close', String(open.number), '--comment', `The next refresh was clean.${runUrl ? ` ${runUrl}` : ''}`]);
}

if (require.main === module) main();
module.exports = { collectWarnings, unmatchedRoamerStations, issueBody, TITLE };
