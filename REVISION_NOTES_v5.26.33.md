# FlightOps 5.26.33 — managed-host PDF reader startup

Live 5.26.32 receives the iPad PDF but the subprocess reports unavailable at
startup. Parent release verification successfully loads the dependency. The
precise hosted startup exception was not exposed by 5.26.32; do not claim an
exact root cause until the new hosted probe confirms it.

Pass the parent's absolute resolved pdf-parse module path to the subprocess.
Preserve NODE_PATH and LD_LIBRARY_PATH for managed-host runtime loading, alongside
the existing minimal environment. Never inherit NODE_OPTIONS, FAA credentials,
FlightOps passwords, session configuration or other application environment.
Keep subprocess isolation, 128 MB JS heap, 10-second deadline and two-process cap.

Run one bounded, synthetic PDF/text check at application startup, sharing the
reader concurrency allowance. Cache the result behind authenticated aircraft
write access; reading its status does not launch another process. Log only
closed status/code/reason enums and a timestamp. Preserve the main application
if the optional importer is unavailable. Do not manufacture a ready result.

The setup page checks this result before offering a new connection, without
revoking existing connections. Replace the misleading Preview error/header and
show private-gateway advice only on Preview. Share PDF instructions no longer
require a section-selection menu absent in the user's Mobile version.

Tests exercise a relocated worker with an absolute resolved dependency, a missing
module, loader-only environment inheritance, reason redaction, health endpoint
access controls and no mission creation, plus the full browser import workflow.
The private original PDF remains outside the repository and is checked locally.
Existing fuel mapping, access controls, duplicate protection, connections, pilot
signoffs, database paths and secrets are unchanged. Hosted readiness must be
verified by the synthetic startup probe before calling this correction complete.

CI keeps all release/tablet checks; use the official HTTPS Ubuntu mirror for
the disposable runner's package downloads instead of its slow regional HTTP
mirror. Package signature verification is unchanged.
