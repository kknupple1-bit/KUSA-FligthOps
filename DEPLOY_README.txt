KUSA FlightOps v5.26.12 — Offline Draft Queue + Cloud Mission Sync

Adds:
- Immediate local draft save remains unchanged.
- Each local draft save is queued to the authenticated server-backed missions store.
- Online: automatic cloud sync.
- Offline: edits queue locally and sync automatically when network returns.
- First sync creates a server mission.
- Later syncs use server revision control.
- Revision conflicts do not overwrite either side silently; the local copy is preserved and the UI shows CLOUD SYNC CONFLICT.
- Completing a mission locally queues the server archive action.
- Offline archive actions synchronize after reconnect.
- Falcon 50 and Falcon 900B draft restores retain their server mission ID/revision.

New status:
- CLOUD SYNCED
- CLOUD SYNC PENDING
- OFFLINE • N CHANGES QUEUED
- SIGN IN REQUIRED FOR CLOUD SYNC
- CLOUD SYNC CONFLICT

Acceptance test:
1. Online: create/load mission and make a harmless change.
2. Wait for local draft save; expect CLOUD SYNCED.
3. Disconnect network.
4. Change seating/fuel/baggage; expect OFFLINE • N CHANGES QUEUED.
5. Reconnect; expect NETWORK RESTORED • SYNCING… then CLOUD SYNCED.
6. Archive a test mission while offline, reconnect, and confirm the queue clears.

Permanent-link note:
A token-free saved link still requires publishing/binding FlightOps to a permanent KUSA production/custom-domain URL. The Airo private Preview token is hosting-layer security and cannot be removed by application code.
