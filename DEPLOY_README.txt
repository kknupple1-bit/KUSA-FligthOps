KUSA FlightOps v5.26.6 deployment patch

ROOT /app:
- server.js
- platform.js

/app/public:
- index.html
- account.html
- sw.js
- admin-users.html
- invite.html
- reset-password.html

v5.26.6:
1. Existing-account invitation handling
   - Invite validation now detects whether the email already has a FlightOps account.
   - Existing users authenticate with their current password.
   - Successful acceptance adds the organization membership and initial aircraft access without creating a duplicate user.
   - New users still use the first-password setup flow.
   - Audit records distinguish INVITATION_ACCEPTED_EXISTING from INVITATION_ACCEPTED.

2. Administrator-issued password recovery
   - Admin can create a one-time reset link from the user roster.
   - Reset tokens are stored only as SHA-256 hashes.
   - Reset links expire after 2 hours.
   - Creating a new reset revokes prior unused reset links for that user.
   - Completing reset revokes all prior active sessions, updates the password, marks token used, logs PASSWORD_RESET_COMPLETED, and signs the user in with a fresh session.

3. UI cleanup
   - Invitation banner now accurately states that acceptance is enabled.
   - Password Reset control added to admin users page.
   - Airo preview share token is preserved in generated reset links.

Not yet enabled:
- Automatic email delivery of invitations/reset links.
- Self-service "forgot password" email workflow.
- FlightOps MFA.

Deploy:
1. /app: replace server.js and platform.js.
2. /app/public: replace index.html, account.html, sw.js, admin-users.html, invite.html; add reset-password.html.
3. Restart Preview App.
4. Ctrl+F5.
5. Verify Browser 5.26.6 / Server 5.26.6.
