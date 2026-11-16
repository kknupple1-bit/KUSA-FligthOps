# FlightOps 5.26.30 — configured defaults and shared aircraft missions

Implemented locally on branch `fix/flightops-revisions-v5.26.30`, based on
`c816c51` (5.26.29). No production data, accounts, credentials or deployment were
changed. Synced project reference files remain untouched.

## Resulting behavior

- New Falcon 50 missions restore the existing 190/190 lb crew and 200 lb taxi
  defaults. Falcon 900B restores its existing 170/170 lb crew and 200 lb taxi
  defaults. These values are evidenced in the saved 5.26.15 app; 900B station
  defaults also appear in its aircraft W&B dataset. This release restores their
  application rather than introducing new approved weight assumptions.
- New missions do not inherit the preceding mission's crew/taxi overrides.
  Loading a plan uses defaults for missing, null or blank crew/taxi values and
  retains valid saved overrides, including explicit zero. Previously stored zeros
  cannot be distinguished from deliberate zeros and are retained for pilot review.
- The 900B restore path reconciles canonical crew entries into W&B stations even
  when the older record has no `wb.loads`. Crew weights feed aircraft-specific
  moments and ZFW. Fuel calculations retain the existing convention: FOB is ramp
  fuel, takeoff fuel is FOB minus taxi, and landing fuel subtracts the separate
  takeoff-to-landing trip burn once. No aircraft source tables or limits changed.
- Both aircraft have explicit departure/destination **Record my NOTAM review**
  actions. Data retrieval and pilot acknowledgment are separate. The record
  includes authenticated signer, server timestamp, mission revision, airport,
  selected runway, notice text, data timestamp and review outcome.
- Acknowledgment can clear a review requirement for an open runway or a quantified
  restriction evaluated against usable distance. It cannot clear a closure,
  unquantified restriction, unavailable NOTAM data, obstacle conflict, failed climb,
  insufficient runway, invalid fuel/W&B, N1 lock or missing source data. Existing
  independent performance gates continue to apply.
- The obstacle exception disposition is individually recorded too. A saved
  disposition from another pilot or an earlier snapshot cannot silently clear it.
  A clean obstacle screen still uses the existing exception-driven workflow.
- **Record my mission review** and **View pilot review history** provide individual
  review records. They document review; they do not approve a mission for flight.
  New data, runway/input changes or a newer saved revision require review again.
  Reload/reopening also requires deliberate acknowledgment; no other pilot's
  acknowledgment is inherited.
- Existing cloud missions become visible to authorized members of the same
  aircraft/Flight Department, retaining creator attribution and original history.
  Aircraft registration comes from the server aircraft assignment, rather than
  trusting a client label. A multi-department user creates missions under the
  selected aircraft's department.
- Department administrators/managers can read and edit department aircraft
  missions. Explicitly assigned pilots can read/edit/sign for assigned aircraft.
  Viewers can read and cannot create, edit, sign, archive or delete. Deletion
  requires the creator or a department administrator/manager. Organization
  membership, active aircraft and current grants are checked on each API request.
- Draft, archive, deletion and revision-history APIs enforce aircraft access.
  Edits, archival and deletion require the expected revision and execute in a
  SQLite transaction with revision history. One of two stale concurrent edits
  receives a conflict rather than overwriting the other. Unchanged autosaves do
  not advance revision, including regenerated offline-cache timestamps and
  object-key ordering. Deletions retain tombstones; interrupted create/archive/
  delete acknowledgments remain retryable.
- Lists refresh on request, foreground/reconnection and every 30 seconds while
  Flight Plans is visible. Changes to an open form create a conflict and preserve
  the local version. **Load latest shared revision** explicitly resolves it,
  retaining a device recovery copy that can be downloaded. Local list writes no
  longer silently discard records at the previous 50-draft/100-archive limits.

## Verification

The checked implementation passes `npm run release:check`: 127 automated tests,
release inventory/hash/version/syntax checks and authenticated isolated-server
smoke checks including restart persistence. The new coverage includes two users
running the shipped sync client, aircraft/department isolation, viewers, revoked
grants, concurrent edits, stale archive/delete, server-assigned signers, historical
signoffs and atomic rollback if revision recording fails.

`npm run release:layout` passes 188 responsive WebKit layout cases across 22 widths
and two locales, 39 numeric-field checks, 57 app-keypad checks, 70 mission-review
checks and a complete authenticated WebKit app workflow for both aircraft. The
complete app workflow verifies default restoration, saved overrides, fuel flow,
NOTAM acknowledgment and closure preservation without uncaught browser errors.
Weather/NOTAMs in these tests are synthetic. Existing fuel, N1, obstacle, weather,
storage, offline/update and pull-refresh regression suites also pass.

Evidence is saved in the project `artifacts/revisions-check.txt`,
`artifacts/revisions-layout.txt` and `artifacts/revisions-browser.txt`.

## Deployment and data transition

Status: **ready for code review and controlled Preview acceptance; not published
and not approved for operational flight use**.

1. Review aircraft assignments and department memberships before enabling shared
   visibility. Existing owner-only cloud missions for an aircraft become shared
   within those existing grants, including prior archived missions. Local-only
   plans still need an authorized successful upload before colleagues can see them.
2. Take a verified SQLite-consistent private backup of Published's durable
   database, including committed WAL data. Validate integrity, foreign keys and
   organization/aircraft linkage on a separate Preview copy. Do not point Preview
   at the live database. Retain the established durable database path/settings.
3. This is an additive schema change: `mission_signoffs` and lookup indexes are
   created idempotently at startup. Existing mission IDs, creators, revisions and
   sessions are preserved. No bulk reassignment or erasure of historical data is
   performed. Investigate any existing mission whose organization differs from
   its aircraft's organization; it intentionally remains inaccessible under a
   mismatched tenant instead of being silently moved.
4. Run required GitHub CI on the reviewed commit, then deploy and verify the exact
   Preview build 5.26.30. Refresh every client. Older clients must update to use
   individual signoffs and versioned archive/delete requests; requests without an
   expected revision are rejected rather than bypassing concurrency protection.
5. Test real department pilot/viewer accounts, both tails, a controlled shared
   draft, two-device conflict recovery and each pilot's NOTAM/mission review.
   Verify live FAA NMS/weather and physical iPad Safari/PWA behavior separately.
   Publish only after these acceptance steps and the normal release authorization.
6. Preserve the current code rollback reference and backup. Old code can read the
   additive schema, but returns to creator-only visibility and cannot enforce the
   new review workflow. Code rollback does not reverse shared edits. Restore the
   database only through a reviewed maintenance/recovery procedure to avoid losing
   legitimate post-backup work.

Online revocation is enforced immediately at the API. Already downloaded local
copies are not remotely erased; the existing trusted-device/offline-grant system
continues to govern offline access. Review device/account handling as part of
department acceptance. No production migration, Preview/live checks, remote CI,
physical-device acceptance or flight-use/source approval is claimed here.

## Existing punch-list boundaries

This release retains and regression-checks earlier taxi/trip accounting, N1
day-of-flight locks, obstacle gates, live-altitude handling, deletion continuity,
update guidance and iPad entry work. The earlier mission-review navigation work
is extended with an actual acknowledgment and individual audit workflow.

The source audit's higher/unbalanced V1 work, anti-ice source-family validation,
remaining human/pilot trace signoffs, source-locked performance/landing cases,
live FAA NMS availability and physical-device acceptance remain separate open
items. This release does not activate those algorithms or claim that the broader
performance-validation punch list is complete.
