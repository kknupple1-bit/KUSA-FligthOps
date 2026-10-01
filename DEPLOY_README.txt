KUSA FlightOps v5.26.2 deployment patch

ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- sw.js
- admin-users.html

Changes:
1. Tenant-isolates aircraft access by organization membership.
2. Administrators/aircraft managers see all active aircraft only within organizations where they hold that role.
3. Pilot/other members see only explicitly granted aircraft in organizations where they are members.
4. /api/admin/users now reports effective aircraft access.
5. Adds read-only /admin-users.html administrator roster.
6. Browser/server/service-worker versions aligned to 5.26.2.

Deployment:
- Upload root files to /app and overwrite exact filenames.
- Upload public files to /app/public and overwrite exact filenames; admin-users.html is new.
- Restart Preview App.
- Hard refresh (Ctrl+F5).
- Verify Browser 5.26.2 / Server 5.26.2.
- Sign in at /account.html, Check Session, then open /admin-users.html.
