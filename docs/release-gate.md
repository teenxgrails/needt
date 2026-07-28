# Repeatable release gate

Run this after every wave and again after competitive features:

1. verify a current backup and additive migration;
2. run type, lint, unit, E2E, visual/style (when applicable), app build,
   worker build, and Docker build;
3. review visual diffs rather than blindly accepting snapshots;
4. deploy the exact green SHA to migration, worker, and web services;
5. verify feature flags and instant rollback;
6. smoke signup, all entitlement fixtures, scheduling, Start Now, Focus,
   Today/Pages fallback, sync, booking, reminders, and 360px mobile;
7. inspect Sentry, `/admin/operations`, cron cursors, queue age/depth, the
   scheduling reaper, log cleanup, backup retention, and Web Push expiry;
8. enable the new feature only after the smoke test.

Google domain verification and Azure Graph consent are release prerequisites
for realtime provider webhooks, not for polling sync.
