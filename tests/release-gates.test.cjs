'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {verifyRelease} = require('../scripts/verify-release.cjs');
const root = path.resolve(__dirname, '..');
const build = JSON.parse(fs.readFileSync(path.join(root, 'RELEASE_MANIFEST.json'))).build;
function fixture(run, withDependencies = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flightops-gate-'));
  try {
    fs.cpSync(root, dir, {recursive: true, filter: name => !['.git', 'node_modules'].includes(path.basename(name))});
    if (withDependencies) fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
    run(dir);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
test('accepts the intact release', () => assert.equal(verifyRelease(root).build, build));
test('blocks the original missing-dependency failure', () => fixture(dir => {
  assert.throws(() => verifyRelease(dir), /Cannot find module 'express'/);
}, false));
test('blocks missing aircraft datasets instead of relying on an embedded fallback', () => fixture(dir => {
  fs.unlinkSync(path.join(dir, 'public/data/f900b_n699bg_wb_v52543.json'));
  assert.throws(() => verifyRelease(dir), /ENOENT|missing/i);
}));
test('blocks valid JSON with altered aircraft data', () => fixture(dir => {
  fs.appendFileSync(path.join(dir, 'public/data/f50_s20_v1_nomograph_rev31.json'), '\n');
  assert.throws(() => verifyRelease(dir), /Release integrity mismatch/);
}));
test('blocks a required dataset removed from the manifest', () => fixture(dir => {
  const file = path.join(dir, 'RELEASE_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(file));
  manifest.files = manifest.files.filter(f => f.path !== 'public/data/f900b_qrh_rev02.json');
  fs.writeFileSync(file, JSON.stringify(manifest));
  assert.throws(() => verifyRelease(dir), /Required file omitted/);
}));
test('blocks mixed build labels even after hashes are regenerated', () => fixture(dir => {
  const name = 'public/sw.js', file = path.join(dir, name);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(`const BUILD="${build}"`, 'const BUILD="0.0.0"'));
  const manifestFile = path.join(dir, 'RELEASE_MANIFEST.json'), manifest = JSON.parse(fs.readFileSync(manifestFile));
  const bytes = fs.readFileSync(file), entry = manifest.files.find(f => f.path === name);
  entry.size_bytes = bytes.length; entry.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  assert.throws(() => verifyRelease(dir), /Service worker build mismatch/);
}));
test('blocks unrecorded application files', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'public/unrecorded.js'), 'console.log("stale upload");');
  assert.throws(() => verifyRelease(dir), /inventory changed/);
}));
test('does not include mutable database or durable user assets in the release', () => fixture(dir => {
  fs.writeFileSync(path.join(dir, 'data/flightops.sqlite'), 'synthetic test database marker');
  fs.mkdirSync(path.join(dir, 'public/assets'), {recursive: true});
  fs.writeFileSync(path.join(dir, 'public/assets/user-file.txt'), 'synthetic durable asset');
  assert.doesNotThrow(() => verifyRelease(dir));
}));
