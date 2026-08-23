---
id: 20260823-codex-launch-l1-sentry
owner: codex
branch: codex/launch-l1-sentry
status: active
updated: 2026-08-23T02:35:13Z
objective: Complete L1.1 Sentry release identity, privacy scrubbing, and source-map upload wiring without a local Docker build.
---

## Scope

- Governing plan/spec: docs/plans/09-launch.md L1.1.
- In scope: Sentry release/service tagging, event sanitization, collaboration capture, CI production-image source-map upload, and exact operator configuration.
- Out of scope: production deployment, credentials, and unrelated L1 items.

## Completed

- Read-only audit confirmed Sentry v10.68.0 supports the required callbacks and that Docker source-map upload currently has no build-time SHA or authentication path.
- Added shared privacy filtering that drops all breadcrumbs, request/user/extra payloads, exception values, trace names, and trace attributes while retaining release-level error classification.
- Tagged web, worker, and collaboration Sentry events by service and build SHA; collaboration now captures startup failure.

## Working state

- Files currently dirty or expected to change: Sentry initializers, shared sanitizer and test, this handoff. CI source-map wiring and deployment documentation remain intentionally untouched pending explicit outbound-data authorization.
- Foreign changes that must remain untouched: all files in the primary and D0 worktrees; this worktree was clean at start.

## Verification

- Passed: npm run agent:context; git status --short (clean at start); `npm run type-check`; `npm run lint -- --quiet`; `npm run test:unit -- --runInBand src/lib/sentry/__tests__/privacy.test.ts`.
- Not run / still required: full unit suite, build-related static gates, CI docker-publish on the merged SHA.

## Decisions and constraints

- The local Docker build gate is retired; CI docker-publish on the same SHA is the production-image verification.
- Never pass Sentry auth as a Docker build argument or image environment variable; use a BuildKit secret only.
- D0 visual/E2E runs remain serialized away from launch tests because they share test Postgres.

## Blockers

- Explicit approval is required before changing CI to upload production source maps and release metadata to the external Sentry service. After approval, configure the existing Sentry token as a BuildKit secret, then add the non-secret organization/project variables. Production deployment remains owner-only.

## Next action

- Commit the completed privacy/runtime tagging unit, then await explicit authorization to wire external Sentry source-map upload.
