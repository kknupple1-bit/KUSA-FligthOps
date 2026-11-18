# FlightOps 5.26.34 — ForeFlight review fuel, date layout and keypad

Transfer reconciled planned ramp FOB from the recognized ForeFlight Mobile
combined export's Block Fuel, including taxi. Require consistent taxi/airborne,
TOW/ELW and block-to-landing balances; validate ZFW balances when supplied.
Preserve explicit FOB and leave ambiguous/conflicting documents for review.
Record planned_block_fuel provenance. Importing planned fuel never sets actual
FOB verification, loading reviews or individual pilot signoffs.

Apply the same proposal to earlier pending import records using their retained
structured fields and confirmed Mobile extraction evidence. Opening a review
does not rewrite the retained source or any saved mission. Trip creation still
requires explicit review and current aircraft access. Duplicate imports keep
their original link; no reupload, new key or connection is needed for this fix.

Use the established iPad/WebKit date sizing rules on the import review page:
shrink grid labels/inputs and suppress native intrinsic date sizing so the date
stays within its own cell. Reuse the existing application number pad on the
three fuel entries, including desktop-mode iPad. Preserve decimals, min/max,
Done/Cancel, zero taxi and native keyboard fallback. Shared keypad rules still
use the main application's existing configuration when available.

Add 80 responsive date/cell/hit/overflow cases across 20 widths, two locales,
iPad and desktop-mode iPad, plus all three review keypads and validation. Add
parser and pending-import regressions and verify planned FOB reaches the full
trip while actual verification/signoffs remain false. All existing operational,
access, duplicate, storage and keypad checks remain required.

The private original PDF and native-graphics-disabled reader checks remain local;
public fixtures use invented data. Hosted reader startup protection from 5.26.33,
database paths, secrets, access grants and existing connections are unchanged.
Physical iPad review/keyboard acceptance remains a user-device check after deploy.
