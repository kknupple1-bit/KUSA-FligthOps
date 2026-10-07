KUSA FlightOps v5.26.14 HOTFIX

Supersedes v5.26.13.

Fixes two acceptance-test failures reported after v5.26.13:
1. iPad numeric-entry keypad: editable numeric fields use iPadOS/Safari-compatible text controls with inputmode=numeric or inputmode=decimal while preserving FlightOps numeric coercion. Whole-number fields also use [0-9]* pattern.
2. Cross-device draft continuity: startup now migrates prior v5.26.12/v5.26.13 sync queues, automatically queues legacy/unsynced local drafts, flushes them to cloud, then hydrates the signed-in user's cloud drafts before updating menu counts. Archive/Drafts view and reconnect use the same reconciliation path.

Retains v5.26.13 punch-list work:
- pull-down/browser refresh restores active mission/view in place
- warning-gate severity hierarchy
- responsive V-speed card layout
- cross-airframe implementation for N33AP and N699BG

Deploy all files over the current app, restart Published App, then hard refresh/reopen FlightOps on each test device.

Acceptance checks:
- iPad: tap editable whole-number and decimal fields and verify numeric/decimal keypad appears.
- Device A: open/save a draft online and wait for CLOUD SYNCED.
- Device B: sign in with the same user credentials, reopen FlightOps while online, then open Draft Flight Plans. The Device A draft should be present without manual sharing.
