'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function within(parent, file) {
  const relative = path.relative(parent, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function physicalPath(file) {
  if (fs.existsSync(file)) return fs.realpathSync(file);
  const parent = path.dirname(file);
  return parent === file ? file : path.join(physicalPath(parent), path.basename(file));
}
function databasePath({env = process.env, appDir = path.resolve(__dirname, '..')} = {}) {
  const configured = String(env.FLIGHTOPS_DB_PATH || '').trim();
  if (env.NODE_ENV !== 'production') return configured || path.join(appDir, 'data', 'flightops.sqlite');
  if (!configured || !path.isAbsolute(configured)) {
    throw new Error('Production requires an absolute FLIGHTOPS_DB_PATH on durable private storage; migrate the existing database before switching paths.');
  }
  const actual = physicalPath(configured);
  const volatile = [appDir, os.tmpdir(), '/tmp', '/var/tmp', '/dev/shm'].map(p => physicalPath(path.resolve(p)));
  if (volatile.some(dir => within(dir, actual))) {
    throw new Error('Production FLIGHTOPS_DB_PATH must be outside the application and temporary directories; use durable private storage such as /private/flightops/flightops.sqlite.');
  }
  if (!fs.existsSync(configured) && env.FLIGHTOPS_INIT_DATABASE !== 'true') {
    throw new Error('Production database is missing. Restore/migrate it first; FLIGHTOPS_INIT_DATABASE=true is only for an explicitly approved empty installation.');
  }
  if (fs.existsSync(configured) && (!fs.statSync(configured).isFile() || fs.statSync(configured).size === 0)) {
    throw new Error('Production database is empty or is not a file; restore a verified database before starting.');
  }
  return configured;
}
module.exports = {databasePath};
