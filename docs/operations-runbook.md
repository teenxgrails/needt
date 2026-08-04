# Needt operations runbook

## Coolify schedules

Configure HTTP callers with a timeout above the endpoint's internal budget:

```text
*/15 * * * * curl --fail --max-time 60 -H "x-cron-secret: $CRON_SECRET" https://needt.example/api/cron/sync-calendars
*/30 * * * * curl --fail --max-time 60 -H "x-cron-secret: $CRON_SECRET" https://needt.example/api/cron/reschedule
17 3 * * * curl --fail --max-time 60 -H "x-cron-secret: $CRON_SECRET" -X POST https://needt.example/api/logs/cleanup
```

The reschedule endpoint has a 45-second application budget, persists its
pending batch before enqueueing work, processes at most 50 users, and resumes
on the next invocation. Per-user `cronWindow:userId` deduplication makes an
interrupted batch safe to replay.

## Backups and restore drill

Configure encrypted Coolify/PostgreSQL backups:

- daily, retained for 14 days;
- weekly, retained for 8 weeks.

Quarterly, restore the newest backup into an isolated scratch database. Never
point a running web or worker service at the scratch database.

```bash
createdb needt_restore_drill
pg_restore --clean --if-exists --no-owner --dbname needt_restore_drill backup.dump
DATABASE_URL=postgresql://.../needt_restore_drill npx prisma migrate status
DATABASE_URL=postgresql://.../needt_restore_drill npx prisma validate
psql postgresql://.../needt_restore_drill -c 'select count(*) from "User";'
psql postgresql://.../needt_restore_drill -c 'select count(*) from "Task";'
dropdb needt_restore_drill
```

Record the backup object, restore timestamp, row-count checks, migration
status, operator, and outcome. A backup is not considered verified until this
drill succeeds.

### Latest verified drill

- Date: 2026-08-04 (pre-release)
- Backup: `needt-prod-backups/data/coolify/backups/databases/root-team-0/postgresql-database-ey10vc8l5lirk6wp7bhld62s-ey10vc8l5lirk6wp7bhld62s/pg-dump-postgres-1785807621.dmp` (315.03 KB in R2)
- Restore target: isolated `needt_restore_drill` database; no web or worker pointed at it
- Row counts at backup restore: `User=6`, `Task=30`; live production had `Task=29` during the drill, indicating a post-backup change
- Validation: `prisma migrate status` found 69 migrations and reported the schema up to date; `prisma validate` passed
- Operator: release owner with Codex guidance
- Outcome: passed; scratch database and copied restore artifact removed

## Workspace rollout rollback

The `workspaces` feature flag is seeded disabled with zero-percent rollout.
Enable users through `FeatureFlagOverride` while the migration is evaluated.
To roll back application behavior, disable the flag and remove any enabled
per-user overrides. The additive workspace tables and nullable `workspaceId`
columns stay in place; legacy `userId` reads and writes remain authoritative
while the flag is off. Do not drop or rewrite the workspace migration.

## Scheduling and queue health

`/admin/operations` is admin-only and shows scheduling success by source,
queue waiting/active/failed depth, oldest waiting age, cron cursors, reaper
state, and the last safe error.

Alerts:

- waiting depth >100 or oldest job >2 minutes: warning;
- waiting depth >500 or oldest job >10 minutes: critical;
- cron age >1.5× its interval: critical;
- scheduling run `FAILED`: error.

`RUNNING` scheduling runs older than 15 minutes are failed by the reaper.
Finished runs are retained for 30 days.

## Secrets

All secrets are runtime variables on both web and worker. Do not use Docker
build args for secrets. After any log exposure:

1. generate and install a new `NEXTAUTH_SECRET` (existing sessions expire);
2. create a new Resend key, install it, send a test message, then revoke the
   old key;
3. verify build logs and image history contain neither value;
4. record the rotation without recording secret material.

Required security/delivery variables include `RATE_LIMIT_HASH_SECRET`,
`SENTRY_DSN`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and
`VAPID_SUBJECT`.

## External prerequisites

- Google domain verification: owner — product administrator.
- Microsoft Graph admin consent: owner — Azure tenant administrator.

Realtime Google/Outlook webhooks remain disabled until those external checks
are complete. Polling sync remains the supported fallback.
