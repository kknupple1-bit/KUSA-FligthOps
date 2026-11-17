# FlightOps 5.26.31 — ForeFlight direct PDF share handoff

Preview candidate only. Do not publish until physical iPad acceptance.

ForeFlight Mobile can share a text-based Navlog/ICAO flight-plan PDF directly to
an Apple Shortcut named **Create KUSA Trip**. The Shortcut posts the PDF to the
FlightOps receiver and opens the returned review link. No email, saving to Files,
or selecting the PDF a second time is part of the per-trip workflow.

## Setup and boundaries

Open **Connect ForeFlight — Create KUSA Trip** from Menu/New Trip, or visit
`/foreflight.html`. Complete the one-time Apple Shortcuts setup on the iPad using
the on-screen instructions. This Windows workstation cannot sign/distribute an
Apple-validated Shortcut installer. No unverified installer or signing service is
provided. The Share action is not automatically installed by deploying the web app.

Preview is behind GoDaddy access control. Navigation preserves its existing
`airoShareToken` into the upload and review URLs when available. A physical test
must establish that a Shortcut request can pass that gateway; an authenticated
desktop browser result alone cannot establish this. If the gateway returns an
HTML sign-in page, stop and resolve the gateway before calling the iPad handoff
accepted. No production key or production data is needed for Preview testing.

The upload-only connection is minted by an explicitly confirmed signed-in user,
hashed at rest, limited to seven days/the originating session lifetime, revocable,
and rechecked against current user status, session and writeable aircraft grants.
It cannot read missions or create/sign a trip. Read/review/create operations use
normal browser authentication and the importing user's identity. Five concurrent
connections per user and twelve new documents per hour are allowed. Parsing has
a two-process concurrency limit, four-MB request bound, twenty-page bound, 128-MB
JavaScript heap bound and ten-second timeout. Parser subprocesses inherit no
FlightOps, FAA or bootstrap credentials. Compressed HTTP upload bodies are refused.
PDF JavaScript evaluation is disabled. No external AI, email or OCR service is used.

## Import behavior

Only explicit, unambiguous labels and ICAO FPL message fields become proposals.
Missing, conflicting, unsupported date/fuel-unit or unreadable image-only fields
are left blank/rejected, not guessed. Explicit pounds are recognized; kg/gallons
are not silently converted. The user confirms local date, aircraft, airports,
ramp fuel, takeoff-to-landing trip burn and separate taxi. The configured 200-lb
taxi default is explicitly labeled when absent from the document.
ForeFlight Block Fuel is displayed as a reference only, never silently mapped to
ramp FOB. Only explicitly labeled ramp/FOB pounds prefill that input. Navlog
route/date/tail headers and English named-month dates are also recognized.

The review's selected aircraft must be currently writable and must match a
detected tail. Confirmation creates one aircraft/department-scoped draft in a
transaction with revision history. Identical PDFs for that importing user reuse
the same review/mission. A deleted imported mission is not resurrected. Different
PDF bytes, even for an amended plan, create a new review and never silently replace
an existing trip. Conflicting edits retain the normal version checks.

F50 starts with configured 190/190 crew; 900B starts 170/170. Passenger/baggage
loading, runway selection, weather/NOTAM data and all acknowledgments remain for
deliberate review. FOB starts unverified. Import confirmation is not a pilot
signoff. PDF hash, extracted proposals, confirmed inputs and authenticated creator
are retained as provenance even after subsequent edits. Original PDFs and upload
keys are not stored with a mission. Uncreated review records expire after 48 hours;
created provenance remains with mission history.

## Verification and deployment

Tests exercise real PDF extraction plus synthetic text/API/browser fixtures,
anonymous/viewer/tenant denial, upload-only authority, key hashing, duplicate
protection, tail/fuel/date validation, scope, default restoration, no inherited
signoffs, transactional rollback, revoked session/grants/keys, body size/media and
responsive review layout. Existing release and WebKit tests remain required.
The existing Express request parser receives a compatible 4.x security patch;
production npm audit is clean. No aircraft dataset/performance algorithm or
database path/secrets are changed. Schema additions are idempotent and private.

No actual pilot ForeFlight export or physical Shortcut/gateway acceptance has
been established by synthetic fixtures. Test the entire handoff on the iPad
using a clearly labeled Preview trip for both tails before proposing publication.
Live stays 5.26.30. Existing recovery-copy follow-up SYSADMIN-366554 is separate.
