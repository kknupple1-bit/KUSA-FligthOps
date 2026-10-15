KUSA FlightOps v5.26.16 FULL PATCH
Mobile / Responsive Stabilization
Built October 15, 2026, from the supplied v5.26.15 FULL_PATCH ZIP.

Deployment
1. Back up current application files and retain the existing platform database.
2. Save active missions as Drafts before upgrading. The complete session snapshot
   starts with v5.26.16; the first upgrade reload can recover only what v5.26.15 saved.
3. Overwrite /app/server.js and /app/platform.js with the supplied replacements.
4. Overwrite the six matching files under /app/public with this public/ folder.
   Retain existing data/, icons/, manifest, dependencies and platform database.
   This is a replacement patch for the supplied files, not a fresh-site installer.
5. Restart the Published App using its existing Node 22+ runtime/configuration.
6. Reconnect Safari/PWA installations online and reload. Confirm browser badge and
   /api/health both report 5.26.16; check account/admin/invite/reset pages as well.
7. Load/refresh a mission online and confirm offline readiness before installed-PWA
   offline testing. Do not clear site data: it holds drafts, cached missions,
   device authorization and queued edits.
8. Run ACCEPTANCE_TESTS.txt on both airframes before accepting the release.

No live deployment was performed. Database schema, credentials, aircraft datasets
and calculation algorithms were not changed. Assets absent from the supplied
baseline ZIP remain prerequisites on the existing production installation.

See RELEASE_NOTES.txt for exact changes and VALIDATION_REPORT.txt for completed
checks and the distinction between local verification and device acceptance.
