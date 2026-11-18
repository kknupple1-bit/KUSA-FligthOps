# v5.26.35 — ForeFlight installer and Reconnect

Pilots can install the reviewed Apple-hosted shortcut from Live Connect ForeFlight
and answer one import question with their own upload connection key. The link
contains no key. Manual action construction is retained only under Advanced.
The Apple-shared action is named `Create KUSA Trip - Installer`; the setup page
identifies that exact name so pilots can find it in the ForeFlight Share Sheet.
Preview explicitly directs installer setup to Live because the connection stores
are separate. The shared master requires an Apple-device acceptance check before
distribution; a Windows source build cannot sign an Apple Shortcut.

An expired upload connection returns the existing shortcut's `open_url` field
with a protected Reconnect destination. After signing in, its owner can renew the
same key, then share the PDF again. Reconnect never uploads a PDF, creates a trip,
or records a pilot signoff. Existing shortcut URLs and keys remain usable.

Renewal requires the current active account/session and current aircraft upload
access. A write transaction enforces the five-active-connection limit, session
binding and seven-day maximum without rotating or returning the key. Revoked
keys cannot be restored. Failed writes roll back and return a safe error.

Validation includes backend authorization/expiry/rollback tests, real WebKit
renewal followed by PDF import for both aircraft, and 43 installer UI checks with
invented keys and mocked Apple links. Existing fuel, W&B, NOTAM hard stops,
individual reviews, sync, PDF reader and tablet entry checks remain required.

Before distribution, inspect the exact Apple-shared workflow: one PDF Share Sheet
input; POST raw File/Shortcut Input to the canonical Live upload endpoint;
`Content-Type: application/pdf`; upload-key header consists only of the Text
output; one import question targeting that Text field with an empty default;
and `open_url` is opened only when present. Reject literal placeholder prefixes,
personal keys, query tokens, extra network actions and bundled documents. Record
the immutable Apple share URL and SHA-256 of the inspected unsigned workflow in
the release configuration. Test a fresh install and PDF handoff on a physical
iPad separately from local software tests.

Reviewed master: https://www.icloud.com/shortcuts/bd579f7f12c5445a899d8225cdb00f3b
Unsigned workflow SHA-256: `9a336b9ed9732082cdc47f7df20da40c25cd96a55c665e877d27b2a813706142`.
Apple reports signing status APPROVED. Inspection confirmed the conditions above
and no personal key or PDF. This is content inspection, not physical iPad execution.

No database path, secret store, schema, aircraft dataset or calculation changes.
Source backup verification does not establish SQLite data recoverability.
