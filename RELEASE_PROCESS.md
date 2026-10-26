# FlightOps controlled software release

Status: READY FOR REVIEW. These checks establish software packaging and basic
application behavior; they do not establish aircraft performance accuracy or
approval for flight use.

## Prepare and verify

1. Work on a release branch. Keep `package.json` and `package-lock.json` together.
2. After an intentional release-file change, run `npm run release:manifest`.
   Review the manifest diff, especially aircraft dataset changes, before committing.
   The checker never regenerates hashes or accepts changed files automatically.
3. Run `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run release:check`.
   These checks cover dependencies; a SHA-256 inventory; JSON and JavaScript
   syntax, including inline browser scripts; version agreement; authenticated
   dataset delivery; both aircraft; and isolated draft persistence/revision
   conflicts/session recovery after restarting the server. All synthetic records
   and credentials use a disposable temporary database. No live weather or FAA
   call, production credential, operational draft, or live database is used.
4. Open a pull request to `main`. Require the GitHub Actions check named
   `FlightOps release gate`, with the branch current, before merging.

## Preview and publish

1. Preserve the currently published commit on a named rollback branch before
   changing the live deployment. A rollback branch preserves code, not the database.
2. In GoDaddy, update Preview from the checked `main` commit. `npm run build`
   runs the same checks. `npm start` also runs the lightweight `prestart`
   integrity/dependency check. It refuses to start incomplete or altered packages.
   Do not bypass these hooks or regenerate the manifest on the hosting server.
3. Confirm the exact Preview commit, browser/server build agreement, both aircraft,
   login, existing draft reopening, weather/NOTAM status, and the affected device
   layouts. Record failures; a green hosting health badge alone is insufficient.
4. Publish that tested Preview. Confirm the Published commit matches, then verify
   `/api/health`, `/api/platform/status`, sign-in, and a controlled draft on the
   live domain. Health must report the expected build, SQLite must be available,
   and protected endpoints must reject unauthenticated access.
5. Record live FAA NMS/weather and physical-device acceptance separately. Local/CI
   smoke tests do not establish availability of those external services or devices.

## Rollback

If post-publish checks fail, restore the saved working commit to the deployment
source through a reviewed revert or corrective commit; update and verify Preview,
then publish. Do not clear site data, stored drafts, signing keys, secrets, or the
live database. A database/schema-changing release requires a verified database
backup and a compatible restoration plan before deployment; code rollback alone
cannot reverse a database migration. Automatic production rollback is not enabled.

## Packaging repair in 5.26.17-deployment.1

The source previously placed many JSON files directly under `public/`, while
server and browser routes expected `public/data/`. The required copies are now
included at those paths. For each server-served dataset, the new packaged copy
matches the server's existing embedded API fallback exactly as parsed JSON,
including both numeric solver route versions and operational overlays. Original
root-level source files, server code, platform code, and aircraft calculations are
unchanged in the packaging repair. The existing `FILE_MANIFEST.json` is the historical 5.26.17 UI patch
manifest; `RELEASE_MANIFEST.json` controls the complete deployment package.

Mutable SQLite files, shared trips, secrets, and durable `public/assets/` files are
excluded from the release fingerprint and must not be committed or overwritten.
GitHub branch protection controls merges; GoDaddy's manual Publish button is a
separate control. Required CI does not remove that button or provide automatic
live-service acceptance.

## iPad date-field fix in 5.26.18-deployment.1

Trip Date uses explicit inline sizing and neutralized native WebKit appearance,
so its date editor remains inside its grid cell. New Trip has two-column field
rows on tablets and a full-width form panel through 1100 CSS pixels. Narrow
layouts retain the phone stack. The same date sizing applies to both aircraft's
Mission date controls. Date types, values, validation, and trip-number behavior
are unchanged. Active browser/server/worker identifiers advance to 5.26.18 so
the new layout can be distinguished from the previous release.

`npm run release:layout` renders the actual form markup/CSS in isolated WebKit
with touch/mobile emulation, 19 viewport widths, two locales, and all three date
forms. GitHub CI installs WebKit and runs this check in addition to the existing
release gate. This checks field containment, overlap, touch size, and independent
entry; it does not replace physical iPad Safari/PWA acceptance.
