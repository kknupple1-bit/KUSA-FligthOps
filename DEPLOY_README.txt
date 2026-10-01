KUSA FlightOps v5.26.5 — Preview Invitation Link Hotfix

Purpose:
- Fixes invite links opened in a private/incognito browser against GoDaddy/Airo Preview.
- Preserves the preview `airoShareToken` in generated invitation links.
- Also forwards the same preview token on invitation API validation/acceptance requests.
- No change to production invitation security. The FlightOps invitation token remains separate from the Airo preview-access token.

Deploy:
1. /app: overwrite server.js and platform.js.
2. /app/public: overwrite index.html, account.html, sw.js, admin-users.html, invite.html.
3. Restart Preview App.
4. Ctrl+F5.
5. Verify Browser 5.26.5 / Server 5.26.5.
6. Create a NEW test invitation from admin-users.html.
7. Copy the generated link. It should contain BOTH:
   ?token=<flightops invitation token>
   &airoShareToken=<preview share token>
8. Open that link in Incognito/Private mode and complete account setup.
