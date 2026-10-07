KUSA FlightOps v5.26.13 FULL PATCH

Baseline: v5.26.12
Performance/W&B source package remains 5.25.86.

v5.26.13 punch-list implementation (both N33AP Falcon 50-4 and N699BG Falcon 900B):
1. Mobile numeric-entry cleanup
   - Number fields receive mobile numeric/decimal keypad hints automatically.
   - Whole non-negative integer fields prefer numeric keypad; decimal/signed fields prefer decimal keypad.
2. Cross-device draft continuity
   - Online startup/Flight Plans view hydrates the signed-in user's cloud drafts from /api/missions?status=draft.
   - Cloud-synced drafts appear on another authorized device after sign-in.
   - Pending offline edits and conflict-marked local copies are never silently overwritten by cloud hydration.
   - Existing revision-conflict protection remains active.
3. iPad pull-down/browser refresh continuity
   - Reload restores the prior FlightOps view and last active draft instead of forcing Menu/Home.
   - Cached/local mission state is retained; online startup then reconciles cloud drafts.
4. Operational warning-gate hierarchy
   - Clear = green treatment, review/caution = amber, blocking/no-go = red.
   - Gates use border/background/badge treatment in addition to color.
5. Responsive V-speed layout
   - Desktop + iPad/tablet: V-speeds stay in one horizontal left-to-right row.
   - iPhone/narrow screens (<=600 px): V-speeds stack vertically.

DEPLOY
ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- admin-users.html
- invite.html
- reset-password.html
- sw.js

After upload/overwrite, restart the Published App, hard refresh once, and verify Browser/Server 5.26.13.

ACCEPTANCE CHECKS
- iPad: tap number fields and confirm numeric/decimal keypad behavior.
- Device A: create/sync draft; Device B: sign in and open Flight Plans; confirm draft appears.
- iPad: open active mission, pull down to refresh; confirm same mission/view returns, not Menu.
- Confirm green/amber/red gate distinction on both airframes.
- Confirm V-speeds are one row on desktop/iPad and vertical on iPhone.
