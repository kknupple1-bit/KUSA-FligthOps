'use strict';
// Run on the existing host BEFORE updating Preview/Published code or DB_PATH.
// Pause FlightOps writes through the snapshot and configuration switch.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');

function verify(file) {
  const db = new DatabaseSync(file, {readOnly: true});
  try {
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') throw new Error('Database integrity check failed');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database foreign-key check failed');
    const counts = {};
    for (const table of ['organizations', 'users', 'memberships', 'sessions', 'missions', 'mission_revisions']) {
      counts[table] = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    }
    return counts;
  } finally { db.close(); }
}
function migrate(source, destination) {
  if (!source || !destination || !path.isAbsolute(source) || !path.isAbsolute(destination)) throw new Error('Source and destination must be absolute paths');
  if (!fs.existsSync(source)) throw new Error('Source database is missing; refusing to create an empty database');
  if (fs.existsSync(destination)) throw new Error('Destination already exists; refusing to overwrite it');
  fs.mkdirSync(path.dirname(destination), {recursive: true, mode: 0o700});
  const backup = `${destination}.pre-migration-${crypto.randomUUID()}.sqlite`;
  const db = new DatabaseSync(source, {readOnly: true});
  try {
    db.exec('PRAGMA busy_timeout=10000');
    // SQLite creates one consistent snapshot, including committed WAL records.
    // Copying only the main .sqlite file could omit those records.
    db.prepare('VACUUM INTO ?').run(backup);
  } finally { db.close(); }
  fs.chmodSync(backup, 0o600);
  const counts = verify(backup);
  // Install a complete snapshot atomically without replacing an existing DB.
  const temporary = `${destination}.install-${crypto.randomUUID()}`;
  fs.copyFileSync(backup, temporary, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(temporary, 0o600);
  try {
    verify(temporary);
    fs.linkSync(temporary, destination);
  } finally { fs.unlinkSync(temporary); }
  return {source, destination, backup, counts};
}
if (require.main === module) {
  try { console.log(JSON.stringify(migrate(process.argv[2], process.argv[3]), null, 2)); }
  catch (error) { console.error(`MIGRATION BLOCKED: ${error.message}`); process.exitCode = 1; }
}
module.exports = {migrate, verify};
