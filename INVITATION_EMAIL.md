# FlightOps invitation email

v5.26.37 replaces the Admin copy-link workflow with Send invitation. The sender
is kusa@kusaaviation.com (verified in the Microsoft 365 tenant directory). The
email includes a welcome, thank-you, selected role and aircraft, a private
seven-day link, existing-account guidance and expiry. The email input is wider
on desktop and spans the available row on iPad and phone.

## Microsoft 365 connection required

Production must configure FLIGHTOPS_INVITATION_MAIL_ENABLED=true,
FLIGHTOPS_MAIL_TENANT_ID, FLIGHTOPS_MAIL_CLIENT_ID and FLIGHTOPS_MAIL_CLIENT_SECRET
in the hosting secret store. Never put a mailbox password, application secret or
invitation link into source, chat or logs. Credentials must belong to an approved
Microsoft Entra application that can send via Graph as kusa@kusaaviation.com.
Use Exchange Online application RBAC to limit Application Mail.Send to this
mailbox; do not grant an unrestricted tenant-wide mail permission. Read and
inbox-management permissions are not needed. Keep Preview email disabled.
Do not alter the database path, FAA credentials or unrelated secrets.

Directory lookup and DNS confirm the address/domain exist; they do not establish
an application grant or actual delivery. Before enabling Send, verify the app's
mailbox restriction, request one explicit test recipient, confirm Microsoft
acceptance and receipt, and inspect the sender's Sent Items. The app never labels
an HTTP 202 response as delivered.

## Reliability and access

Only active signed-in organization administrators can send with the dedicated
action header. Aircraft must belong to that organization. A persisted request ID
and fingerprint prevent duplicate sends across retry, concurrency and restart;
changing a request under the same ID is rejected. Ten sends per administrator
per minute are allowed. The original invitation/account acceptance rules remain.
Only hashes of invitation tokens are stored. New mail requests and safe audit
events are stored without invitation URLs, passwords or provider tokens.

A missing mail connection creates no invitation. A definite provider rejection
revokes the unused link. A timeout/uncertain provider result preserves the link
and tells the administrator to check the recipient or Sent Items; it never
blindly sends again. A server interruption retains pending status for the same
reason. Preview rejects email sends even if mail credentials are present.

## Validation

Required checks: release:check (includes invitation-mail tests), release:layout,
and the Admin UI's responsive layout and send/error/retry states. Test traffic
uses invented addresses/credentials, an isolated SQLite database and mocked
Microsoft responses. No test may send invitations to actual users implicitly.
Actual sender authorization and mailbox receipt remain hosted acceptance checks.

v5.26.37 checks the saved Microsoft connection on startup when email is enabled.
This check obtains an application token but sends no mail. Its log contains only
connection success, a fixed failure reason, HTTP status and a numeric Microsoft
error code. Failed sends likewise log their phase without provider text, tokens,
recipient details or invitation links. This distinguishes rejected credentials
from sending permission failures during hosted release checks.

Microsoft documentation:
https://learn.microsoft.com/en-us/graph/api/user-sendmail
https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac
