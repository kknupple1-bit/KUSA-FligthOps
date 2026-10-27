'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {releaseFiles, requiredFiles} = require('./release-files.cjs');
const root = path.resolve(__dirname, '..');
for (const file of requiredFiles) {
  if (!fs.statSync(path.join(root, file)).isFile()) throw new Error(`Missing ${file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = {
  schema: 'kusa.flightops.release.v1',
  build: pkg.version,
  release: `${pkg.version}-deployment.1`,
  status: 'READY FOR REVIEW',
  scope: 'Software packaging integrity; not aircraft performance or flight-use approval.',
  files: releaseFiles(root).map(file => {
    const bytes = fs.readFileSync(path.join(root, file));
    return {path: file, size_bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  })
};
fs.writeFileSync(path.join(root, 'RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Recorded ${manifest.files.length} release files for ${manifest.release}. Review before committing.`);
