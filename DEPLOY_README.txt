KUSA FlightOps v5.26.7 — Mandatory Login Gate

Milestone:
- Authentication is now the normal operating mode.
- The main FlightOps application and operational APIs are protected by a server-side session gate.
- Unauthenticated browser navigation redirects to /account.html.
- Unauthenticated operational API calls return 401 AUTH_REQUIRED.
- Account page is now the production sign-in/session page, not a test page.
- Successful sign-in returns the user to the originally requested FlightOps URL.
- Main FlightOps header includes an Account button.
- Public onboarding/recovery pages remain accessible:
  account.html, invite.html, reset-password.html, manifest/icons.
- /api/health remains public for service health checks.
- All previously registered auth/invite/reset routes remain available by design.

Important security change:
The old service worker could fall back to a cached index.html while offline. Once mandatory authentication is enabled, that would allow a stale cached operational shell to bypass the server gate. v5.26.7 removes protected app/performance data from offline caching and makes protected navigation/API/data network-only.

Therefore:
- Secure offline operational mode is TEMPORARILY LOCKED in v5.26.7.
- This is intentional, not a regression to be ignored.
- A later build should restore offline capability only with explicit device authorization and secure local-session controls.

Deployment:
ROOT /app
- server.js
- platform.js

/app/public
- index.html
- account.html
- sw.js
- admin-users.html
- invite.html
- reset-password.html

Steps:
1. Replace server.js and platform.js in /app.
2. Replace all six public files in /app/public.
3. Restart Preview App.
4. Hard refresh Ctrl+F5.
5. Confirm Browser 5.26.7 / Server 5.26.7.
6. Sign OUT.
7. Navigate to the FlightOps root URL.
8. Confirm automatic redirect to account.html.
9. Sign in.
10. Confirm automatic return to FlightOps.
11. Open /api/diagnostics while signed out in a private window and confirm AUTH_REQUIRED.
12. Confirm /api/health remains available.

Configuration:
- FLIGHTOPS_AUTH_REQUIRED now defaults to TRUE.
- Setting FLIGHTOPS_AUTH_REQUIRED=false remains an emergency rollback switch.
