'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');

test('mobile pull gesture is wired to an in-app refresh control',()=>{
  assert.match(html,/id="pullRefreshIndicator"/);
  assert.match(html,/installPullToRefresh/);
  assert.match(html,/touchstart/);
  assert.match(html,/touchmove/);
  assert.match(html,/touchend/);
  assert.match(html,/Release to refresh/);
});

test('pull refresh reloads active operational mission data without discarding the mission',()=>{
  assert.match(html,/if\(window\.currentMissionMeta\)\{\s*await refreshToldOperationalData\(\);/s);
  assert.match(html,/saveCurrentDraft\(\)/);
  assert.match(html,/persistRefreshContext\(\{saveDraft:true\}\)/);
});

test('pull refresh does not claim live refresh while offline',()=>{
  assert.match(html,/Offline — live refresh unavailable/);
  assert.match(html,/if\(!navigator\.onLine\)/);
});
