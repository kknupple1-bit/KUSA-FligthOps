# FlightOps 5.26.33 — hosted text-reader startup

Live 5.26.32 receives the authenticated iPad PDF, but its reader fails during
initialization. The first hosted self-check identified missing DOM graphics APIs;
the native canvas bootstrap also failed on this host. Those candidates were
kept off Live.

Text extraction now initializes PDF.js with the pinned canvas package's complete
JavaScript DOMMatrix implementation directly, without requiring native canvas
rendering. Use the packaged, pinned PDF.js worker file through its local file
URL. A text-only canvas factory throws on any rendering operation; offscreen
canvas and image decoding are disabled. No fake matrix, rasterization, OCR,
remote worker, external service or new dependency is used. Missing/unsupported
content still fails closed. Parent release checks verify the geometry module
and packaged worker exist. Real document/page/text limits are unchanged.

Pass parent-resolved absolute dependency paths and the minimal managed-host
loader environment to the isolated worker. Exclude NODE_OPTIONS, FAA credentials,
FlightOps passwords and session configuration. Keep the 128 MB JS heap,
10-second deadline and two-process cap.

One bounded synthetic PDF/text startup probe shares that cap. Cache its status
behind authenticated aircraft write access; reading status starts no new process.
Log only closed status/code/reason enums and timestamp. Preserve the core app
if importing is unavailable. Setup shows reader availability before offering a
new connection; existing connections and keys are unchanged. Live errors/help
no longer say Preview, and ForeFlight Share PDF instructions require no absent
section-selection menu.

Tests block native canvas and .node imports, relocate the worker, and still
require real text extraction and Mobile fuel reconciliation. Test missing modules,
secret exclusion, safe diagnostics, endpoint authorization and no mission created
by the probe. The original private PDF is checked locally outside the repo.
Fuel mapping, access controls, duplicate protection, pilot signoffs, database
paths and secrets remain unchanged. Require a successful GoDaddy probe before
claiming the hosting correction works or publishing it.

All application/tablet release checks remain required. The disposable CI runner
uses Ubuntu's official HTTPS mirror to avoid the preceding slow regional HTTP
downloads; package signature verification is unchanged. Browser tests wait for
synthetic background NOTAM requests before unloading the document; all uncaught
error assertions remain enabled.
