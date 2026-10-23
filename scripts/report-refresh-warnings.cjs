#!/usr/bin/env node
'use strict';
// After a successful daily refresh, surface any source that fell back to the last published data.
// The run still publishes, so GitHub sends no failure email; one open issue carries the warning
// instead, and it closes itself after the next clean refresh.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const TITLE = 'Daily data refresh kept some previous data';

function collectWarnings(root = ROOT) {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  return [...(read('refresh-summary.json').warnings || []), ...(read('charging-summary.json').warnings || [])];
}

function issueBody(warnings, runUrl) {
  return [
    'The daily refresh published, but some sources could not be read and kept their last published data:',
    '',
    ...warnings.map(w => `- ${w}`),
    '',
    'Kept records show their original “last checked” date. If this repeats on the next run, the source format has probably changed and the parser needs an update.',
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
  for (const warning of warnings) console.log(`::warning title=Kept previous data::${warning}`);
  if (!process.env.GH_TOKEN) return;
  const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--search', `"${TITLE}" in:title`, '--json', 'number,title']))
    .find(issue => issue.title === TITLE);
  if (warnings.length && open) gh(['issue', 'comment', String(open.number), '--body', issueBody(warnings, runUrl)]);
  else if (warnings.length) gh(['issue', 'create', '--title', TITLE, '--body', issueBody(warnings, runUrl)]);
  else if (open) gh(['issue', 'close', String(open.number), '--comment', `All sources were read on the next refresh.${runUrl ? ` ${runUrl}` : ''}`]);
}

if (require.main === module) main();
module.exports = { collectWarnings, issueBody, TITLE };
