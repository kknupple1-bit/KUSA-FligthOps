# Durable FlightOps database storage

FlightOps accounts, internal user IDs, sessions, draft plans, revisions and device
authorizations live in SQLite. GoDaddy rebuilds `/app` on deployment; its durable
private store is `/private`. Successful cloud upload does not establish deploy
persistence if the database is still inside `/app/data`.

Production now requires an explicit absolute `FLIGHTOPS_DB_PATH` outside the app
and temporary directories. It refuses a missing database rather than silently
creating new account IDs. Development/tests retain their existing local default.

## Existing production installation — migrate before changing deployment

1. Arrange a maintenance window: pause writes on all devices until the switch is
   complete. Obtain execution access to the currently running Published host from
   GoDaddy; the dashboard file manager exposes Preview files only.
2. Copy the reviewed standalone `scripts/migrate-database.cjs` onto that existing
   host. Do not update or publish app code first: that can replace the source DB.
3. On the existing Published host run:

   ```sh
   node migrate-database.cjs /app/data/flightops.sqlite /private/flightops/flightops.sqlite
   ```

   Verify the reported account/mission/session counts against the installation.
   The tool takes a SQLite-consistent snapshot including committed WAL records,
   checks integrity and foreign keys, retains a separate private backup, and
   refuses to overwrite a destination. The original database remains untouched.
   Keep the private backup and a separately secured recovery copy.
4. Set **Publish** `FLIGHTOPS_DB_PATH=/private/flightops/flightops.sqlite`.
   Do not set `FLIGHTOPS_INIT_DATABASE` for an existing installation. Configure
   and validate Preview independently; never point it at Published's live DB.
5. Follow `RELEASE_PROCESS.md`: preserve a rollback code branch, require release
   CI, validate Preview, then publish. Check the same existing account/session
   still works and its cloud plan count is unchanged. Create a labeled draft,
   refresh another device, restart Published, and verify it still downloads.
   Validate another publish under maintenance before declaring deployment
   persistence accepted. Release the maintenance window only after acceptance.

If the host cannot expose the existing Published database or run the snapshot
tool, stop the configuration switch and obtain a verified snapshot through
GoDaddy support. A Preview export is not evidence of a Published database backup.

## First installation only

An operator may explicitly set `FLIGHTOPS_INIT_DATABASE=true` once to create a
brand-new database on private storage, then remove that setting. This recreates
account identities; do not use it to repair an existing installation.

## Recovery

Keep writes paused. Select the verified private backup under a separate filename
and point `FLIGHTOPS_DB_PATH` to that file before restoring compatible code. Never
overwrite a running database or copy only a WAL database's main `.sqlite` file.
The previous app version honors `FLIGHTOPS_DB_PATH`, so code rollback can retain
the migrated database. A code rollback alone does not restore lost data.
