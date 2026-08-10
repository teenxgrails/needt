# Collaboration runtime and smoke contract

Pages and Moodboards share the self-hosted Hocuspocus 4 server built by
`npm run build:collaboration`. Web, worker and collaboration artifacts must come
from the same commit and use the same PostgreSQL and Redis services.

## Authorization boundary

- Five-minute HMAC tokens bind the user, workspace, resource ID, room and
  issued role. The server never trusts the role claim as current authority.
- Every connect and reconnect resolves the active user, paid shared-workspace
  membership and current Page or Moodboard role from PostgreSQL.
- Every inbound socket message rechecks current access before Hocuspocus
  applies it. A downgrade changes the live connection to read-only; removal,
  archival, deactivation or lost entitlement closes it with code `4403`.
- Idle sockets are rechecked every 15 seconds so revoked clients stop receiving
  updates even when they send nothing.

Needt-owned code imports Yjs only through
`src/lib/collaboration/yjs.ts`. Root npm overrides keep Hocuspocus, Tiptap,
`y-protocols` and the app on one Yjs installation. BullMQ and ioredis are
external Node dependencies in the Next.js build; they must never enter a client
bundle.

## Required smoke

`tests/e2e/collaboration.spec.ts` starts a real Hocuspocus server against the
isolated test database and proves:

1. an Editor can connect, edit and reconnect with a valid exact-room token;
2. an Editor downgraded to Viewer cannot publish the next Yjs update;
3. removing the member closes an idle socket and denies reconnect;
4. a valid token cannot authenticate to a guessed room.

Terra T3 must run this test after the database seed and before image release:

```bash
npm run test:e2e -- tests/e2e/collaboration.spec.ts
npm run check:collaboration-runtime
npm run build:collaboration
```

The run fails if either Yjs package is duplicated, the collaboration artifact
does not build, or the socket boundary accepts a stale role or membership.
