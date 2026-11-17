# FlightOps 5.26.32 — actionable ForeFlight PDF failure diagnostics

Preview only; Live remains 5.26.30. The iPad handoff has now reached the upload
receiver with a PDF, but the combined 5.26.31 error did not distinguish document
decoding, unsupported flight-plan layout, page/text limits or hosting failure.
The user's exact ForeFlight PDF has not yet been reproduced or fixed.

Return closed, actionable error codes/messages for password protection, invalid
PDF, no extracted page text, too many pages/text, reader startup/exit/timeout,
unrecognized layout and storage failure. Hosting failures use 503, document
problems 422, and storage failure 500. Responses include a short random reference.
Logs contain only that reference, a fixed stage/code, byte/page counts and elapsed
milliseconds; never PDF text, routes, filenames, keys, identities, hashes, URLs or
provider messages. Child process setup failure and IPC failure are classified too.

Use actual extracted page text to identify empty/image-only documents; PDF
library-added page separators do not constitute readable text. No OCR, relaxed
recognition, page/size increase or new permission is added. Failed uploads still
create no trip or signoff. Existing iPad upload connections and settings are
unchanged; keep the existing Shortcut configuration for the next test.

New checks verify distinct document/hosting outcomes, safe diagnostics and trace
references, no mission creation after errors, and an actual text-empty PDF. Full
release and WebKit regression checks remain required. After deployment retry the
same PDF once and inspect the new code/reference. If it is a format problem,
obtain that exact PDF privately for reproduction; a synthetic PDF does not prove
compatibility with the user's export.
