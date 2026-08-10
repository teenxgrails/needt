# Offline data contract

Needt treats browser persistence as private tenant data. `public/sw.js` owns the
service-worker contract; `src/lib/pwa/offline-client.ts` owns session lifecycle.

## Scope

Private Cache Storage and IndexedDB keys include the offline schema version,
authenticated user ID and active workspace ID. Static build assets may use the
shared static cache because they contain no user data.

Changing workspaces deactivates the previous queue without replaying it in the
new workspace. Changing accounts or logging out removes every private cache,
snapshot, queued mutation, persisted user store and local editor draft.

## Queue policy

Only these idempotent mutations may be saved offline:

- `PUT`, `PATCH` or archive-style `DELETE` for one task;
- `PUT /api/daily-agenda`;
- `PUT /api/pages/:id/blocks`.

Auth, admin, billing, public-link, connector and physical-delete operations are
never queued. Offline creates are excluded until their server operation owns a
durable idempotency record.

Every queued item carries an idempotency key, workspace header, base revision
when available and replay status. A replay is removed only after a `2xx` response.
`401`, `403`, `409`, other `4xx` and `5xx` responses remain stored as recovery
states; conflicts and rejected writes are not retried automatically.

## Verification

```bash
npm run test:unit -- --runInBand src/components/pwa
NEXT_PUBLIC_PWA_IN_DEV=1 npm run test:e2e -- tests/offline.spec.ts
node --check public/sw.js
npm run type-check
npm run lint
```
