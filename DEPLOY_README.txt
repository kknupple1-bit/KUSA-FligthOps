KUSA FlightOps v5.26.9 — Signed Trusted-Device Offline Shell

Secure offline shell access is restored only for a browser holding a valid server-signed trusted-device grant.

Offline-capable: cached FlightOps shell, cached /api/me and /api/aircraft, and deterministic /api/data/* or /data/* responses after they have been used online.

Still network-required: weather, NOTAM, live runway/network data, diagnostics, shared trips, mission writes/sync, and other server write actions.

Deploy: replace server.js and platform.js in /app; replace all six public files in /app/public; restart; Ctrl+F5; verify Browser/Server 5.26.9. Then authorize this device, use both aircraft/performance pages online to populate cache, disconnect network, reload FlightOps, and confirm SECURE OFFLINE MODE appears. Revoke device and confirm offline reload is denied.
