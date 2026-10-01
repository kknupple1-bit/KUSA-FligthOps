KUSA FlightOps v5.26.4 deployment patch

ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- sw.js
- admin-users.html
- invite.html

v5.26.4 milestone:
- Completes first-time invitation acceptance workflow.
- Administrator can assign initial aircraft when creating an invitation.
- Invitation token is stored only as SHA-256 hash in SQLite.
- Public invite link validates invitation status/expiration before showing account setup.
- New user supplies display name and a password of at least 12 characters.
- Acceptance atomically creates the user, organization membership, and explicit aircraft access.
- Invitation is marked accepted and linked to the created user.
- Successful acceptance creates the normal persistent HttpOnly session automatically.
- Administrator audit log records INVITATION_ACCEPTED.
- Existing-account takeover is intentionally blocked; if an invited email already has a user account, acceptance stops with ACCOUNT_ALREADY_EXISTS.
- Browser/server/service-worker versions align to 5.26.4.

Still intentionally NOT enabled:
- Automatic email delivery of invitations.
- Existing-account join flow.
- Password reset/recovery.
- MFA inside FlightOps.

Deploy:
1. Upload server.js + platform.js to /app and overwrite exact filenames.
2. Upload all five files in /public to /app/public; overwrite existing files and add invite.html.
3. Restart Preview App.
4. Hard refresh Ctrl+F5.
5. Verify Browser 5.26.4 / Server 5.26.4.
6. Sign in as administrator and open /admin-users.html.
7. Create a TEST invitation using an email address not already in FlightOps.
8. Choose initial aircraft access and copy the generated invite link.
9. Open the invite link in a private/incognito browser window.
10. Set name + 12+ character password and verify automatic sign-in.
11. Return to admin-users.html and confirm the new user, role, aircraft access, and INVITATION_ACCEPTED audit event.
