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
   runs the release integrity/dependency/syntax checks. Full isolated-server and
   WebKit tests run in required GitHub CI: GoDaddy disallows the temporary server
   port used by the smoke test during its build. `npm start` also runs the
   lightweight `prestart` integrity/dependency check. It refuses to start
   incomplete or altered packages.
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

## Flight Plans refresh and continuity in 5.26.19-deployment.1

The Flight Plans Refresh action now reconciles the account with the server,
instead of only redrawing local storage. Both draft and archived plans download.
Completed-plan reports and saved display metadata travel with new uploads;
older server records still retain their available state and summary without
inventing missing result values. Returning to the app or reconnecting refreshes
the list, and a visible Flight Plans screen checks again every 30 seconds.

The header uses a nonshrinking Refresh button, with a full-width button on
small phones. The list reports its account, last successful cloud check,
pending uploads and conflicts. Each plan distinguishes local-only/pending
data from an acknowledged cloud save. A local edit made during an upload keeps
its own queue entry and receives another upload pass. Download, authentication,
and storage failures retain local copies. Known ownership mismatches do not
upload a plan into a different account.

Create retries reuse the same owner's client mission identity after an
interrupted acknowledgement. A differing reused cloud record creates a local
conflict rather than silently replacing it. An already-completed archive
acknowledgement can be retried without producing a false draft-update conflict.
No aircraft performance algorithms or source datasets change in this release.

The required CI suite now includes the actual client sync functions running in
two independent device stores against a temporary server/SQLite database. It
tests draft transfer, archive transfer, offline recovery, conflicts, interrupted
uploads, sign-in failures, ownership protection and storage rollback. The
WebKit layout suite covers 22 widths and includes the Flight Plans Refresh
button (176 cases across two locales). These tests do not establish whether a
specific user plan has uploaded from a physical device.

## v5.26.20 — TOLD attention contrast

Override the shared blue button theme for both aircraft TOLD attention links. Review-required controls use amber backgrounds, borders and warning symbols; an explicitly recorded F50 obstacle conflict uses red and STOP text. The cleared summary uses green. This changes presentation only: no aircraft limits, fuel calculations, verification decisions or user records are changed. The separately reported taxi/landing-fuel calculation defect remains unresolved and is outside this visual patch.

## v5.26.21 — Separate taxi and trip-burn accounting

F50 landing fuel now equals FOB minus taxi burn minus takeoff-to-landing trip burn, matching the existing F900B convention. Landing weight, fuel moment/CG path, reserve display, landing performance inputs, summaries and newly calculated archives consume the corrected result. Invalid taxi-plus-trip plans block the F50 W&B/fuel readiness indicators and show an explicit red attention message; clamped zero landing fuel cannot clear the gate. Input labels now state that trip burn excludes taxi. Stored numeric inputs and historical archive summaries are retained; previously saved plans require review under the clarified convention. No aircraft source tables, limits or fuel-moment schedules changed.

## v5.26.22 — Explicit N1 day-of-flight planning status

Keep the F50 trip-date/weather/source interlocks and numeric table unchanged. A non-current trip date displays amber PLANNING ONLY / N1 DAY-OF-FLIGHT VERIFICATION PENDING without operational N1 numbers. The TOLD attention action names the N1 requirement and navigates to weather; an N1-only pending condition no longer generates the generic takeoff-performance/obstacle action. Mixed pending requirements remain visible. Evaluate Takeoff now consumes the same N1 gate as automatic synchronization so it cannot transiently clear date/weather/source locks. Existing independent no-go conditions retain priority. Same-day numeric/source evaluation is software calculation status, not independent pilot verification or flight-use approval.

Includes the earlier PR #6 corrections: synchronize TOLD and draft save after every evaluation outcome (including early NO-GO and errors), explicitly identify destination runway NOTAM verification, and show the actual takeoff status for other pending requirements. PR #7 supersedes that earlier review branch.

## v5.26.24 — Durable account and draft storage

Production requires an explicit database path outside application/temporary directories and refuses a missing database unless an empty installation is explicitly enabled. See DURABLE_DATABASE.md for the required pre-deployment Published snapshot, private backup, maintenance window, configuration switch and rollback. The SQLite snapshot includes committed WAL records and preserves account IDs, sessions and draft ownership. Migration/persistence tests are part of the release gate. Aircraft calculations and source datasets are unchanged.

## v5.26.25 — Draft deletion, update guidance and iPad entry

Delete now synchronizes an owner-scoped soft deletion with the server. The deleted status and original history remain in SQLite to prevent stale/offline devices from resurrecting a plan. Devices download those deletion markers, stop active-draft auto-save and discard matching local copies. Offline or failed deletion remains visibly pending and retries after reconnecting. Archive and bulk-delete controls use the same path. Deletion confirmations describe account/device scope; old-account copies are removed only locally. No schema migration or aircraft calculation changes.

A persistent Update Now notice explains version differences, saves the current draft locally and preserves refresh context before reloading, and mentions signing in again if prompted. Offline/save failures do not reload the page. Version checks run at startup, foreground return and successful pull refresh. Refresh Data Status remains a status check, not an installer. Existing 5.26.24 clients still need a normal reload to obtain this new prompt.

iPad numeric initialization is consolidated so older handlers cannot overwrite the requested keypad mode or change text fields back to number/telephone inputs. Whole numbers use text/numeric/pattern hints; signed/decimal entries use decimal hints and retain the sign control. Tests cover iPad and desktop-mode iPad DOM configuration, focus and decimal/negative entry, but native keyboard presentation requires physical iPad acceptance. The earlier reported TOLD color difference remains outside this patch pending comparison of matching environments/trips.

## v5.26.26 — Dedicated iPad number pad and FOB row alignment

On iPad/iPhone touch browsers, including iPad desktop mode, editable numeric inputs open an app-owned number pad. Native keyboard input is suppressed only after that component is available; a keyboard fallback remains. Done validates the existing field bounds and commits input/change events once; Cancel, Escape and switching to the native keyboard retain the original value. Whole-number fields disable decimal/sign keys; signed decimal fields enable them. Desktop input remains native, calculated/read-only fields are excluded, and dynamically inserted controls receive the same configuration. Authenticated offline shell caching includes both new static assets.

Remove the redundant FROM NEW TRIP suffix from both Mission FOB labels and reserve equal label space within tablet fuel rows so wrapped labels cannot shift the entry boxes out of alignment. The component tests cover tap entry, replacement, Done/Cancel, bound errors, negative/decimal values, hardware keys, keyboard fallback, event counts, dynamic fields and 744/768/834/1024px fuel-row alignment. Physical iPad acceptance is still needed. No aircraft calculations, user data, database schema or TOLD gate logic changes.
