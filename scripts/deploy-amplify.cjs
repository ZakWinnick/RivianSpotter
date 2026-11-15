#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { createHash } = require('node:crypto');

function awsJson(args) {
  const output = execFileSync('aws', ['amplify', ...args, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}

async function deploy({ appId, branch, archive, aws = awsJson, upload = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 120 }) {
  if (!appId || !branch || !archive) throw new Error('App ID, branch, and artifact are required');
  const { jobId, zipUploadUrl } = aws(['create-deployment', '--app-id', appId, '--branch-name', branch]);
  if (!jobId || !zipUploadUrl) throw new Error(`Amplify did not prepare an upload for ${branch}`);
  const response = await upload(zipUploadUrl, { method: 'PUT', body: fs.readFileSync(archive), headers: { 'Content-Type': 'application/zip' } });
  if (!response.ok) throw new Error(`Amplify artifact upload failed for ${branch}: HTTP ${response.status}`);
  aws(['start-deployment', '--app-id', appId, '--branch-name', branch, '--job-id', jobId]);
  for (let i = 0; i < attempts; i++) {
    const status = aws(['get-job', '--app-id', appId, '--branch-name', branch, '--job-id', jobId]).job?.summary?.status;
    if (status === 'SUCCEED') return jobId;
    if (['FAILED', 'CANCELLED'].includes(status)) throw new Error(`Amplify deployment ${jobId} for ${branch} ended ${status}`);
    await pause(5000);
  }
  throw new Error(`Amplify deployment ${jobId} for ${branch} did not complete in time`);
}

async function verifyCatalog({ appId, branch, expected, request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 12 }) {
  const expectedHash = createHash('sha256').update(expected).digest('hex');
  const url = `https://${branch}.${appId}.amplifyapp.com/api/v1/catalog.json`;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await request(url, { cache: 'no-store' });
      if (response.ok) {
        const body = Buffer.from(await response.arrayBuffer());
        if (createHash('sha256').update(body).digest('hex') === expectedHash) return;
      }
    } catch { /* Retry transient propagation failures. */ }
    await pause(5000);
  }
  throw new Error(`Published catalog for ${branch} does not match the validated artifact`);
}

if (require.main === module) {
  (async () => {
    const appId = process.env.AMPLIFY_APP_ID;
    const archive = process.argv[2];
    const expected = execFileSync('unzip', ['-p', archive, 'api/v1/catalog.json']);
    for (const branch of ['staging', 'beta']) {
      const job = await deploy({ appId, branch, archive });
      await verifyCatalog({ appId, branch, expected });
      console.log(`Amplify ${branch} deployment ${job} succeeded and catalog matched`);
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { deploy, verifyCatalog };
