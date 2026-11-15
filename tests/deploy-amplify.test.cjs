'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { deploy } = require('../scripts/deploy-amplify.cjs');

test('uploads the artifact and waits for a successful Amplify deployment', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'amplify-test-'));
  const archive = join(dir, 'site.zip');
  writeFileSync(archive, 'validated artifact');
  const calls = [];
  let polls = 0;
  const aws = args => {
    calls.push(args[0]);
    if (args[0] === 'create-deployment') return { jobId: '42', zipUploadUrl: 'https://upload.invalid' };
    if (args[0] === 'get-job') return { job: { summary: { status: ++polls === 1 ? 'RUNNING' : 'SUCCEED' } } };
    return {};
  };
  try {
    const job = await deploy({ appId: 'd123', branch: 'beta', archive, aws, upload: async (url, request) => {
      assert.equal(url, 'https://upload.invalid');
      assert.equal(request.body.toString(), 'validated artifact');
      return { ok: true };
    }, pause: async () => {} });
    assert.equal(job, '42');
    assert.deepEqual(calls, ['create-deployment', 'start-deployment', 'get-job', 'get-job']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('does not start a deployment when its upload fails', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'amplify-test-'));
  const archive = join(dir, 'site.zip');
  writeFileSync(archive, 'artifact');
  const calls = [];
  try {
    await assert.rejects(deploy({ appId: 'd123', branch: 'beta', archive, aws: args => {
      calls.push(args[0]);
      return { jobId: '42', zipUploadUrl: 'https://upload.invalid' };
    }, upload: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
    assert.deepEqual(calls, ['create-deployment']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('catalog verification rejects stale content and retries until it matches', async () => {
  const { verifyCatalog } = require('../scripts/deploy-amplify.cjs');
  let calls = 0;
  await verifyCatalog({ appId: 'd123', branch: 'beta', expected: Buffer.from('current'), pause: async () => {}, request: async url => {
    assert.equal(url, 'https://beta.d123.amplifyapp.com/api/v1/catalog.json');
    return new Response(++calls === 1 ? 'old' : 'current');
  } });
  assert.equal(calls, 2);
});

test('catalog verification fails rather than accepting stale data', async () => {
  const { verifyCatalog } = require('../scripts/deploy-amplify.cjs');
  await assert.rejects(verifyCatalog({ appId: 'd123', branch: 'beta', expected: Buffer.from('current'), attempts: 2, pause: async () => {}, request: async () => new Response('old') }), /does not match/);
});

test('extracts catalogs larger than the default process output buffer', () => {
  const { mkdirSync } = require('node:fs');
  const { execFileSync } = require('node:child_process');
  const { extractCatalog } = require('../scripts/deploy-amplify.cjs');
  const dir = mkdtempSync(join(tmpdir(), 'amplify-large-'));
  try {
    mkdirSync(join(dir, 'api', 'v1'), { recursive: true });
    const expected = Buffer.alloc(1200000, 65);
    writeFileSync(join(dir, 'api', 'v1', 'catalog.json'), expected);
    execFileSync('zip', ['-q', 'site.zip', 'api/v1/catalog.json'], { cwd: dir });
    assert.deepEqual(extractCatalog(join(dir, 'site.zip')), expected);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
