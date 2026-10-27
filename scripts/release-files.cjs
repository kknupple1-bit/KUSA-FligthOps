'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Runtime-owned data (SQLite, shared trips, and public/assets) is not a release asset.
function releaseFiles(root) {
  const files = ['server.js', 'platform.js', 'package.json', 'package-lock.json',
    'data/runways.json', 'scripts/release-files.cjs', 'scripts/verify-release.cjs',
    'scripts/database-storage.cjs', 'scripts/migrate-database.cjs'];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
      const name = `${relative}/${entry.name}`;
      if (name === 'public/assets') continue;
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) files.push(name);
      else throw new Error(`Unsupported release asset: ${name}`);
    }
  }
  visit('public');
  return files.sort();
}

// These paths are part of the application's delivery contract, not optional fallbacks.
const requiredFiles = [
  'server.js', 'platform.js', 'package.json', 'package-lock.json', 'data/runways.json',
  'scripts/database-storage.cjs', 'scripts/migrate-database.cjs',
  'public/numeric-entry.js', 'public/numeric-entry.css',
  'public/weather-math.js', 'public/mission-review.js', 'public/mission-review.css',
  'public/index.html', 'public/account.html', 'public/admin-users.html',
  'public/invite.html', 'public/reset-password.html', 'public/sw.js',
  'public/manifest.webmanifest', 'public/icons/icon-192.png', 'public/icons/icon-512.png',
  'public/data/f900b_qrh_rev02.json', 'public/data/f900b_n699bg_wb_v52543.json',
  'public/data/f900b_operational_overlays_v52541.json',
  'public/data/f900b_dtm9823_digitization_v52551.json',
  'public/data/f900b_dtm9823_numeric_v52553.json',
  'public/data/f900b_dtm9823_numeric_v52555.json',
  'public/data/f50_s20_nomograph_rev31.json', 'public/data/f50_s20_v1_nomograph_rev31.json'
];
module.exports = {releaseFiles, requiredFiles};
