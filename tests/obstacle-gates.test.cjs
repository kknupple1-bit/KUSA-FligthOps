'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('clear obstacle-NOTAM screen plus passing OEI climb clears without pilot acknowledgement', () => {
  assert.match(html, /function obstacleBaselineClimbReady\(\)/);
  assert.match(html, /climb\.pass===true&&Number\.isFinite\(climb\.gradient\)/);
  assert.match(html, /auto\.status==="REVIEWED"&&baselineClimbReady.*state:"BASELINE_CLEAR"/s);
  assert.match(html, /NO OBSTACLE NOTAM FLAG • CLIMB DATA READY/);
  assert.match(html, /no separate pilot obstacle acknowledgement is required/i);
});

test('flagged or unavailable obstacle-NOTAM screen requires pilot exception review', () => {
  assert.match(html, /auto\.status==="FLAGGED".*manualReviewRequired:true/s);
  assert.match(html, /auto\.status==="UNAVAILABLE".*manualReviewRequired:true/s);
  assert.match(html, /OBSTACLE NOTAM REVIEW REQUIRED/);
  assert.match(html, /OBSTACLE NOTAM SCREEN UNAVAILABLE/);
});

test('explicit pilot conflict remains a blocking takeoff condition', () => {
  assert.match(html, /pilot==="false".*state:"CONFLICT".*cleared:false/s);
  assert.match(html, /NO-GO • PILOT OBSTACLE CONFLICT/);
});

test('pilot obstacle control is exception-driven rather than always mandatory', () => {
  assert.match(html, /Pilot Obstacle Review — Exception Only/);
  assert.match(html, /pilotControl\.style\.display=showPilot\?"":"none"/);
});
