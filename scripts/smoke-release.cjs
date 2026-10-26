'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {setTimeout: delay} = require('node:timers/promises');
const {verifyRelease} = require('./verify-release.cjs');

async function smokeRelease() {
  const root = path.resolve(__dirname, '..');
  const manifest = verifyRelease(root);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'flightops-smoke-'));
  const password = crypto.randomBytes(24).toString('hex');
  const email = 'release-check@flightops.invalid';
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  // Never use deployment credentials or a real mission database. No external URL input.
  const env = {PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
    NODE_ENV: 'test', PORT: String(port), FLIGHTOPS_AUTH_REQUIRED: 'true',
    FLIGHTOPS_DB_PATH: path.join(temp, 'flightops.sqlite'),
    FLIGHTOPS_ADMIN_EMAIL: email, FLIGHTOPS_ADMIN_PASSWORD: password,
    FLIGHTOPS_ADMIN_NAME: 'Isolated Release Check'};
  let child, logs = '', cookie = '';
  async function request(route, options = {}) {
    assert(route.startsWith('/') && !route.startsWith('//'));
    return fetch(base + route, {redirect: 'manual', ...options,
      headers: {...(cookie ? {Cookie: cookie} : {}), ...options.headers}, signal: AbortSignal.timeout(8000)});
  }
  async function json(route, options = {}) {
    const response = await request(route, options);
    const body = await response.json();
    return {response, body};
  }
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      try { await exited; } finally { clearTimeout(timer); }
    }
  }
  async function start() {
    child = spawn(process.execPath, ['server.js'], {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.on('data', chunk => { logs = (logs + chunk).slice(-64000); });
    child.stderr.on('data', chunk => { logs = (logs + chunk).slice(-64000); });
    let spawnError;
    child.on('error', error => { spawnError = error; });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`Server exited before ready (${child.exitCode})`);
      try {
        const {response, body} = await json('/api/health');
        if (response.ok && body.ok && body.build === manifest.build) return;
      } catch (_) {}
      await delay(100);
    }
    throw new Error('Server startup/health deadline exceeded');
  }
  try {
    await start();
    let result = await json('/api/platform/status');
    assert.equal(result.body.database, 'sqlite');
    assert.equal(result.body.ok, true);
    assert.equal(result.body.auth_required, true);
    assert.equal(result.body.authenticated, false);
    assert.equal((await request('/api/missions')).status, 401);
    assert.equal((await request('/api/data/f900b_qrh_rev02')).status, 401);
    const redirect = await request('/');
    assert.equal(redirect.status, 302);
    assert(redirect.headers.get('location').startsWith('/account.html'));
    const account = await request('/account.html');
    assert.equal(account.status, 200);
    assert((await account.text()).includes(`v${manifest.build}`));
    result = await json('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password: 'incorrect-release-test-password'})});
    assert.equal(result.response.status, 401);
    result = await json('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})});
    assert.equal(result.body.ok, true);
    const sessionHeader = result.response.headers.get('set-cookie');
    assert(sessionHeader?.includes('HttpOnly') && sessionHeader.includes('SameSite=Lax'));
    cookie = sessionHeader.split(';')[0];
    assert.equal((await request('/')).status, 200);
    const aircraft = (await json('/api/aircraft')).body.aircraft;
    assert(aircraft.some(a => a.registration === 'N33AP'));
    assert(aircraft.some(a => a.registration === 'N699BG'));

    const dataRoutes = {
      f900b_qrh_rev02: 'f900b_qrh_rev02.json',
      f900b_n699bg_wb_v52545: 'f900b_n699bg_wb_v52543.json',
      f900b_operational_overlays_v52541: 'f900b_operational_overlays_v52541.json',
      f900b_dtm9823_v52551: 'f900b_dtm9823_digitization_v52551.json',
      f900b_dtm9823_numeric_v52553: 'f900b_dtm9823_numeric_v52553.json',
      f900b_dtm9823_numeric_v52555: 'f900b_dtm9823_numeric_v52555.json',
      f50_s20_nomograph_rev31: 'f50_s20_nomograph_rev31.json'
    };
    for (const [route, file] of Object.entries(dataRoutes)) {
      result = await json(`/api/data/${route}`);
      assert.equal(result.response.status, 200, route);
      assert.deepEqual(result.body, JSON.parse(fs.readFileSync(path.join(root, 'public/data', file))), route);
    }
    for (const file of manifest.files.filter(f => f.path.startsWith('public/data/') && f.path.endsWith('.json'))) {
      result = await json('/' + file.path.slice('public/'.length));
      assert.equal(result.response.status, 200, file.path);
      assert.deepEqual(result.body, JSON.parse(fs.readFileSync(path.join(root, file.path))), file.path);
    }
    const saved = [];
    for (const registration of ['N33AP', 'N699BG']) {
      const airframe = aircraft.find(a => a.registration === registration);
      result = await json('/api/missions', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({aircraft_id: airframe.id, trip_number: 'RELEASE-CHECK', departure: 'KBPT', destination: 'KDAL',
          payload: {release_test: true, registration, marker: 'original'}})});
      assert.equal(result.response.status, 201);
      const mission = result.body.mission;
      const update = {expected_revision: mission.revision, payload: {release_test: true, registration, marker: 'saved'}};
      result = await json(`/api/missions/${mission.id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(update)});
      assert.equal(result.response.status, 200);
      assert.equal(result.body.mission.revision, 2);
      const stale = await request(`/api/missions/${mission.id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(update)});
      assert.equal(stale.status, 409);
      saved.push({id: mission.id, registration});
    }
    await stop();
    await start();
    assert.equal((await json('/api/platform/status')).body.authenticated, true);
    for (const mission of saved) {
      result = await json(`/api/missions/${mission.id}`);
      assert.equal(result.response.status, 200);
      assert.equal(result.body.mission.payload.marker, 'saved');
      assert.equal(result.body.mission.payload.registration, mission.registration);
      assert.equal(result.body.mission.revision, 2);
    }
    assert(!/static file unavailable|MODULE_NOT_FOUND/i.test(logs), 'Server used a missing-file fallback');
    await request('/api/auth/logout', {method: 'POST'});
    assert.equal((await request('/api/missions')).status, 401);
    console.log(`PASS isolated smoke: startup, authentication, both aircraft, ${Object.keys(dataRoutes).length} data APIs, all static datasets, draft save/update/conflict/restart recovery, logout.`);
    console.log('Live weather/FAA NMS, physical devices and aircraft calculation approval are separate acceptance checks.');
  } finally {
    await stop();
    fs.rmSync(temp, {recursive: true, force: true});
  }
}
if (require.main === module) smokeRelease().catch(error => {console.error(`RELEASE BLOCKED: ${error.message}`); process.exitCode = 1;});
module.exports = {smokeRelease};
