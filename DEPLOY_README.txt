KUSA FlightOps v5.26.10 — Offline Mission Package + Production URL Readiness

PRIMARY FIX FROM v5.26.9 TEST
v5.26.9 proved the signed trusted-device offline shell, but the user correctly found that
mission-dependent fields still showed LOAD MISSION FIRST / SOURCE LOCKED offline.

v5.26.10 adds a persistent Offline Mission Package.

ONLINE PREPARATION
- Every successful Load / Refresh Mission saves the complete returned mission package locally:
  departure/destination/alternate point data, runway arrays, runway geometry/source metadata,
  weather snapshot used for the mission, and the mission-derived data object.
- Active drafts now embed a copy of that package.
- The app displays:
  OFFLINE READY — MISSION CACHED
  or
  NOT OFFLINE READY — LOAD / REFRESH MISSION ONLINE
- The last active mission ID is retained locally.

OFFLINE RESTORE
- loadMission() now falls back to the saved Offline Mission Package when the network request fails.
- Draft restore passes its exact saved mission package back into the mission loader.
- When FlightOps is opened offline, the last active cached draft is automatically resumed when possible.
- Runway selectors are rebuilt from the saved package instead of remaining on LOAD MISSION FIRST.
- Selected departure/destination runways are restored.
- Passenger/cabin/fuel/baggage/manual-weather draft state continues to restore.
- Startup Data Status checks deterministic local performance/W&B data instead of leaving the box on CHECKING.
- Live weather, FAA NMS/NOTAM and live NASR remain correctly unavailable offline.

OFFLINE ACCEPTANCE TEST
1. Online: create/load a real mission.
2. Confirm OFFLINE READY — MISSION CACHED.
3. Verify departure/destination runways are selected and the mission draft has auto-saved.
4. Disconnect Ethernet/Wi-Fi.
5. Reload FlightOps.
6. Expected: last active mission automatically restores.
7. Expected: departure/destination runway selectors are populated from the cached mission package.
8. Expected: passenger seating, fuel, baggage and weights restore.
9. Expected: deterministic V-speeds/performance calculations can use cached mission/runway inputs.
10. Expected: live weather/NOTAM/NASR remain unavailable and clearly identified as such.

STABLE URL / NO AIRO TOKEN
- FlightOps application links now treat airoShareToken as PREVIEW-ONLY compatibility.
- On a normal published/custom domain, no token is added or required by FlightOps.
- Airo/GoDaddy private Preview itself still requires its hosting share token; application code cannot override that host security.
- For a permanent saved iPad/iPhone/PC link, publish the app to a stable GoDaddy production/custom-domain URL
  (recommended target: flightops.kusaaviation.com or another KUSA-controlled subdomain).
- Once published, KUSA FlightOps login remains mandatory; only the temporary Airo hosting token disappears.

Deployment:
ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- sw.js
- admin-users.html
- invite.html
- reset-password.html

1. Replace files as above.
2. Restart Preview App.
3. Ctrl+F5.
4. Verify Browser 5.26.10 / Server 5.26.10.
5. Load a mission ONLINE and confirm OFFLINE READY — MISSION CACHED.
6. Perform the Ethernet-disconnect test above.

After the app test passes, publish/bind the stable KUSA URL in GoDaddy. That hosting step is separate from the FlightOps code deployment.
