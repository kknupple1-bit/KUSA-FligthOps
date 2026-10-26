'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {releaseFiles, requiredFiles} = require('./release-files.cjs');

function verifyRelease(root = path.resolve(__dirname, '..')) {
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  const manifest = JSON.parse(read('RELEASE_MANIFEST.json'));
  if (manifest.schema !== 'kusa.flightops.release.v1' || !Array.isArray(manifest.files))
    throw new Error('Invalid release manifest');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required');
  if (typeof require('node:sqlite').DatabaseSync !== 'function') throw new Error('SQLite is unavailable');
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  if (manifest.build !== pkg.version || lock.packages?.['']?.version !== pkg.version)
    throw new Error('Release/package/lockfile build mismatch');
  if (JSON.stringify(pkg.dependencies) !== JSON.stringify(lock.packages?.['']?.dependencies))
    throw new Error('Package and lockfile dependencies differ; run npm install --package-lock-only');
  const appRequire = createRequire(path.join(root, 'package.json'));
  for (const dependency of Object.keys(pkg.dependencies || {})) {
    appRequire(dependency); // Load transitive dependencies, not just a directory-presence check.
    const installed = appRequire(`${dependency}/package.json`).version;
    const expected = lock.packages?.[`node_modules/${dependency}`]?.version;
    if (!expected || installed !== expected) throw new Error(`Installed ${dependency} does not match lockfile; run npm ci`);
  }
  const recorded = new Map();
  for (const file of manifest.files) {
    if (typeof file.path !== 'string' || path.isAbsolute(file.path) || file.path.split('/').includes('..') || recorded.has(file.path))
      throw new Error('Unsafe or duplicate manifest path');
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isInteger(file.size_bytes) || file.size_bytes < 1)
      throw new Error(`Invalid manifest entry: ${file.path}`);
    const full = path.join(root, file.path);
    if (!fs.lstatSync(full).isFile()) throw new Error(`Release file is not a regular file: ${file.path}`);
    const bytes = fs.readFileSync(full);
    if (bytes.length !== file.size_bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256)
      throw new Error(`Release integrity mismatch: ${file.path}`);
    if (file.path.endsWith('.json') || file.path.endsWith('.webmanifest')) JSON.parse(bytes.toString('utf8'));
    recorded.set(file.path, file);
  }
  for (const file of requiredFiles) if (!recorded.has(file)) throw new Error(`Required file omitted from manifest: ${file}`);
  const actual = releaseFiles(root);
  if (JSON.stringify(actual) !== JSON.stringify([...recorded.keys()].sort()))
    throw new Error('Release inventory changed; review and regenerate RELEASE_MANIFEST.json');
  const server = read('server.js');
  for (const match of server.matchAll(/serveJsonFileOrFallback\(res,"([^"]+\.json)"/g)) {
    if (!recorded.has(`public/data/${match[1]}`)) throw new Error(`Server dataset missing from release: ${match[1]}`);
  }
  for (const file of actual.filter(f => f.endsWith('.html'))) {
    const html = read(file);
    let count = 0;
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=|\btype\s*=\s*["'](?:application\/ld\+json|application\/json|importmap)/i.test(script[1])) continue;
      new vm.Script(script[2], {filename: `${file}:inline-${++count}`});
    }
    for (const match of html.matchAll(/["'`]\/data\/([^"'`?]+\.json)/g))
      if (!recorded.has(`public/data/${match[1]}`)) throw new Error(`Browser dataset missing from release: ${match[1]}`);
  }
  const build = manifest.build.replace(/\./g, '\\.');
  if (!new RegExp(`app\\.get\\("/api/health"[^\\n]*build:"${build}"`).test(server)) throw new Error('Server health build mismatch');
  if (!new RegExp(`installPlatform\\(app,\\{build:"${build}"`).test(server)) throw new Error('Platform build mismatch');
  if (!new RegExp(`const BUILD="${build}"`).test(read('public/sw.js'))) throw new Error('Service worker build mismatch');
  if (!read('public/index.html').includes(`const expected="${manifest.build}"`)) throw new Error('Browser build mismatch');
  for (const page of ['account', 'admin-users', 'invite', 'reset-password'])
    if (!read(`public/${page}.html`).includes(`v${manifest.build}`)) throw new Error(`${page} build mismatch`);
  for (const file of ['server.js', 'platform.js', 'public/sw.js']) new vm.Script(read(file), {filename: file});
  return manifest;
}
if (require.main === module) {
  try {
    const manifest = verifyRelease();
    console.log(`PASS release ${manifest.release}: dependencies, ${manifest.files.length} file hashes, JSON, syntax and build labels.`);
  } catch (error) {
    console.error(`RELEASE BLOCKED: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = {verifyRelease};
