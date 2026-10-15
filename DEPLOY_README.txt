KUSA FlightOps v5.26.17 FULL PATCH — Version Label / Mobile Navigation
Base: deployed v5.26.16, using the complete local v5.26.16 patch source.

Changes:
- Version label now sits in normal document flow beneath the app heading.
  It is no longer a fixed overlay and cannot cover navigation or result content.
- Mobile navigation has six columns for its six buttons, keeping Account in
  the same row and preventing an unexpected second row beneath the old badge.
- All active browser/server/platform/worker/account/admin build references are
  5.26.17. Aircraft logic, data and mission continuity are unchanged.

Deploy:
1. Overwrite /app/server.js and /app/platform.js.
2. Overwrite the six corresponding files in /app/public with public/ contents.
3. Retain the database, data files, icons, manifest and existing configuration.
4. Restart Published App; reconnect Safari/PWA online and reload.
5. Confirm browser header and server health both show 5.26.17.
   Do not clear site data or stored drafts.

Acceptance:
- On iPhone Safari and installed PWA, all six bottom buttons are visible and
  tappable; inspect at the top of the page and after scrolling to the bottom.
- The version appears below the app heading and scrolls with the header. It
  never floats over the bottom menu, regardless of safe-area inset.
- Test small/large iPhones, landscape and iPad split view on both airframes.
- Confirm the v5.26.16 TOLD layout and refresh continuity remain intact.

Local verification:
- Backend/worker syntax and all nine inline scripts passed compilation checks.
- Headless Edge layout checks passed at 320/375/390/430/600/700/768/1024px:
  badge is in the header, is static, and does not intersect navigation.
- At phone widths all six buttons share one row, have at least 44px width/height,
  and their centers receive pointer events without an overlay intercepting them.
- All files except index.html differ from v5.26.16 only in the build number.

Packaged only; no production deployment was performed.
