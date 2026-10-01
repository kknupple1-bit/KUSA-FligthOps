KUSA FlightOps v5.26.3 deployment patch

ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- sw.js
- admin-users.html

v5.26.3 changes:
- Controlled administrator write actions.
- Disable/re-enable users.
- Revoke all active sessions for another user.
- Change membership role with safeguards against self-demotion and removing the last active administrator.
- Assign explicit aircraft access for pilot/viewer users, scoped to the administered organization.
- Create server-side invitation records (7-day token) for controlled testing.
- Adds persistent administrator audit log.
- Tenant isolation from v5.26.2 remains enforced.
- Browser/server/service-worker versions aligned to 5.26.3.

Safety controls:
- Administrator authorization is enforced server-side.
- All target users must belong to an organization the actor administers.
- Self-disable is blocked.
- Self session revocation is blocked.
- Self administrator demotion is blocked.
- Last active administrator demotion is blocked.
- Aircraft IDs are validated against the organization.
- Disabling a user revokes that user's active sessions.

Important:
Invitation email delivery and invitation acceptance are NOT enabled yet. v5.26.3 creates the invitation record and returns the raw token once for controlled testing only.

Deploy:
1. Upload server.js + platform.js to /app and overwrite exact filenames.
2. Upload all files in /public to /app/public and overwrite exact filenames.
3. Restart Preview App.
4. Hard refresh Ctrl+F5.
5. Verify Browser 5.26.3 / Server 5.26.3.
6. Sign in, Check Session, then open /admin-users.html.
