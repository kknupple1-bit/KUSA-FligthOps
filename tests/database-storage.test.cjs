'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {databasePath} = require('../scripts/database-storage.cjs');
const {migrate} = require('../scripts/migrate-database.cjs');
const root = path.resolve(__dirname, '..');

function fixture(run) {
  const dir = fs.mkdtempSync(path.join(root, '.storage-test-'));
  try { return run(dir); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
test('production refuses missing/relative/volatile paths and unintended empty databases', () => fixture(dir => {
  const appDir = path.join(dir, 'app'); fs.mkdirSync(appDir);
  for (const value of ['', 'relative.sqlite', path.join(appDir, 'data/db.sqlite')]) {
    assert.throws(() => databasePath({appDir, env: {NODE_ENV: 'production', FLIGHTOPS_DB_PATH: value}}));
  }
  const target = path.join(dir, 'private/flightops.sqlite');
  assert.throws(() => databasePath({appDir, env: {NODE_ENV: 'production', FLIGHTOPS_DB_PATH: target}}), /database is missing/);
  assert.equal(databasePath({appDir, env: {NODE_ENV: 'production', FLIGHTOPS_DB_PATH: target, FLIGHTOPS_INIT_DATABASE: 'true'}}), target);
  fs.mkdirSync(path.dirname(target));fs.writeFileSync(target, '');
  assert.throws(() => databasePath({appDir, env: {NODE_ENV: 'production', FLIGHTOPS_DB_PATH: target}}), /database is empty/);
}));
test('production rejects an indirect path through a symlink into the app', () => fixture(dir => {
  const appDir = path.join(dir, 'app');fs.mkdirSync(appDir);
  const link = path.join(dir, 'alias');fs.symlinkSync(appDir, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => databasePath({appDir, env: {NODE_ENV: 'production', FLIGHTOPS_DB_PATH: path.join(link, 'db.sqlite')}}), /outside the application/);
}));
test('migration retains account identity, sessions, drafts and WAL commits across replacement of app files', () => fixture(dir => {
  const oldApp = path.join(dir, 'old-app'), newApp = path.join(dir, 'new-app');
  for (const app of [oldApp, newApp]) {
    fs.mkdirSync(path.join(app, 'scripts'), {recursive: true});
    fs.copyFileSync(path.join(root, 'platform.js'), path.join(app, 'platform.js'));
    fs.copyFileSync(path.join(root, 'scripts/database-storage.cjs'), path.join(app, 'scripts/database-storage.cjs'));
  }
  const source = path.join(oldApp, 'data/flightops.sqlite'), destination = path.join(dir, 'private/flightops.sqlite');
  const bootstrap = spawnSync(process.execPath, ['-e', "require('./platform').state.db.close()"], {
    cwd: oldApp, encoding: 'utf8', env: {...process.env, NODE_ENV: 'test', FLIGHTOPS_DB_PATH: source,
      FLIGHTOPS_ADMIN_EMAIL: 'storage@flightops.invalid', FLIGHTOPS_ADMIN_PASSWORD: crypto.randomBytes(24).toString('hex')}
  });
  assert.equal(bootstrap.status, 0, bootstrap.stderr);
  const live = new DatabaseSync(source);live.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  const user = live.prepare('SELECT id FROM users').get().id;
  const aircraft = live.prepare('SELECT id,organization_id FROM aircraft LIMIT 1').get();
  live.prepare("INSERT INTO missions(id,organization_id,aircraft_id,owner_user_id,status,payload_json,created_at,updated_at) VALUES('future-draft',?,?,?,'draft',?,datetime('now'),datetime('now'))")
    .run(aircraft.organization_id, aircraft.id, user, JSON.stringify({marker: 'persisted in WAL'}));
  live.prepare("INSERT INTO sessions(id,user_id,token_hash,created_at,last_seen_at,expires_at) VALUES('existing-session',?,'synthetic-token-hash',datetime('now'),datetime('now'),'2099-01-01')").run(user);
  // Keep source connection open: these committed rows are still in its WAL.
  const result = migrate(source, destination);
  assert.equal(result.counts.missions, 1); assert.equal(result.counts.sessions, 1);
  assert(fs.existsSync(result.backup));assert(fs.existsSync(source));
  live.close();
  fs.renameSync(oldApp, path.join(dir, 'retired-app'));
  const probe = "const p=require('./platform');console.log(JSON.stringify({user:p.state.db.prepare('SELECT id FROM users').get().id,mission:p.state.db.prepare('SELECT owner_user_id,payload_json FROM missions').get(),sessions:p.state.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n}));p.state.db.close()";
  for (let restart = 0; restart < 2; restart++) {
    const child = spawnSync(process.execPath, ['-e', probe], {cwd: newApp, encoding: 'utf8',
      env: {...process.env, NODE_ENV: 'production', FLIGHTOPS_DB_PATH: destination, FLIGHTOPS_INIT_DATABASE: ''}});
    assert.equal(child.status, 0, child.stderr);const after = JSON.parse(child.stdout);
    assert.equal(after.user, user);assert.equal(after.mission.owner_user_id, user);
    assert.equal(JSON.parse(after.mission.payload_json).marker, 'persisted in WAL');assert.equal(after.sessions, 1);
  }
  assert.throws(() => migrate(source, destination), /Source database is missing/);
  assert.throws(() => migrate(path.join(dir, 'retired-app/data/flightops.sqlite'), destination), /Destination already exists/);
}));
test('missing or invalid source never creates an empty destination', () => fixture(dir => {
  const source = path.join(dir, 'bad.sqlite'), destination = path.join(dir, 'private/db.sqlite');
  assert.throws(() => migrate(source, destination), /Source database is missing/);
  fs.writeFileSync(source, 'not a SQLite database');
  assert.throws(() => migrate(source, destination));assert(!fs.existsSync(destination));
}));
