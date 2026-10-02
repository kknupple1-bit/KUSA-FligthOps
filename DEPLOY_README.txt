KUSA FlightOps v5.26.8 — Trusted Offline Device Foundation

Adds:
- Per-browser trusted-device enrollment.
- ECDSA P-256 signing key persisted in SQLite.
- Signed offline authorization token containing user, memberships, authorized aircraft, profile keys,
  performance-data-package versions, build, device identity, issue time, and expiration.
- Default offline grant validity: 7 days.
- Optional FLIGHTOPS_OFFLINE_GRANT_DAYS override (1–30).
- Current user can revoke this device.
- Administrator audit events for authorization/revocation.
- Account page Trusted Offline Device controls.

Security:
- This build establishes signed device authorization only.
- It does NOT yet re-enable the protected operational offline shell.
- Service worker remains network-only for protected FlightOps navigation/APIs/data.
- Next build can verify the signed grant before serving an offline operational shell.

Deploy:
1. /app: replace server.js and platform.js.
2. /app/public: replace index.html, account.html, sw.js, admin-users.html, invite.html, reset-password.html.
3. Restart Preview App.
4. Ctrl+F5.
5. Verify Browser 5.26.8 / Server 5.26.8.
6. Sign in -> Account -> Authorize This Device.
7. Confirm expiration appears, refresh and confirm it persists.
8. Revoke, verify it clears, then authorize again for continued offline-shell testing.
