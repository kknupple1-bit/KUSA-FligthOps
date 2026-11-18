# FlightOps 5.26.32 — ForeFlight Mobile combined PDF import

Preview only. Live remains 5.26.30.

Reproduced the reported failure with the original four-page Mobile combined
export: PDF decoding succeeds, but the export lacks the ForeFlight / Navlog
wording required by the old recognition gate. Recognize this layout from its
route/date/tail header plus Summary & Times, Fuel & Weights, ICAO Flight Plan
and fuel labels. Partial structural matches remain rejected.

Keep Flight Fuel as a reference total. In this recognized layout it includes
taxi: propose airborne trip burn only when Flight Fuel minus Taxi Fuel agrees
with TOW minus ELW, and Block Fuel minus Landing Fuel agrees with Flight Fuel
(within one pound). Otherwise require manual trip burn. Conflicting explicit
Trip Fuel remains blank. Block Fuel never becomes ramp FOB automatically.
Exclude Alternate Fuel/Burn labels from alternate-airport extraction.

Retain closed diagnostic codes and random references for document limits,
password/invalid/no-text PDFs, reader startup/exit/timeout, unrecognized layout
and storage failure. Logs contain only stage/code, random reference, size/page
counts and elapsed time; no document text, filenames, routes, keys, identities,
hashes, URLs or provider detail. No OCR or increased document limits.

Public regression fixtures use invented data. The private PDF and extracted
pilot details remain outside the repository. Browser checks import the Mobile
layout, require ramp FOB confirmation, verify airborne/taxi mapping through the
complete trip, and reject duplicates. Access controls and individual reviews
are unchanged. Preserve existing iPad upload connections and Shortcut settings.

Required CI retains all application and tablet checks on fixed Ubuntu 24.04.
Allow 35 minutes: system-package download previously consumed the entire
20-minute job before tablet tests could finish. No checks are skipped.

Physical iPad Share PDF acceptance remains required after Preview deployment.
