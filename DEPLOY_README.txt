KUSA FlightOps v5.26.11 — Account Navigation Hotfix

Fix:
- Account page now has an always-visible "Back to FlightOps" button.
- The button respects the original ?next= destination when present.
- Preview share-token compatibility is preserved only on preview hosts.
- Existing "Continue to FlightOps" and "User Administration" controls remain unchanged.

Deploy:
1. /app: replace server.js and platform.js.
2. /app/public: replace index.html, account.html, sw.js, admin-users.html, invite.html, reset-password.html.
3. Restart Preview App.
4. Ctrl+F5.
5. Verify Browser 5.26.11 / Server 5.26.11.
6. Click Account from FlightOps.
7. Confirm "Back to FlightOps" returns directly to the app.
