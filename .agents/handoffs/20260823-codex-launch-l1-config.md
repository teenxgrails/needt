---
id: 20260823-codex-launch-l1-config
owner: codex
branch: codex/launch-l1-config
status: complete
updated: 2026-08-23T02:52:59Z
objective: Complete L1.4's exact production environment checklist and enforce that the production image build receives no secrets.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L1.4.
- In scope: reconcile `docs/deploy.md` §3, `ENV_TEMPLATE.md`, and `.env.example`; document runtime versus public build-time Sentry values; add static regression coverage for env exclusion and workflow build-arg safety.
- Out of scope: source-map upload, Sentry credentials or external configuration, Docker image builds, deployment/rollback policy, and D0.

## Completed

- Recovered the L1 context and confirmed the worktree was clean at start.
- Confirmed `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_ENVIRONMENT` are browser-only configuration consumed by `instrumentation-client.ts`; Next 15 inlines `NEXT_PUBLIC_*` values during the image build.
- Reconciled the base, rate-limit, server/browser Sentry, and VAPID checklists across `docs/deploy.md`, `ENV_TEMPLATE.md`, and `.env.example`.
- Added static coverage that `.env*` is excluded from the production Docker context and that `docker-publish` passes only the non-secret build SHA, while the production Dockerfile declares no runtime secret as `ARG` or `ENV`.
- `3004f13 docs(launch): document production environment contract` records the scoped L1.4 unit.

## Working state

- Files currently dirty or expected to change: this handoff checkpoint only; `node_modules` is an ignored symlink to the primary checkout solely for validation.
- Foreign changes that must remain untouched: primary checkout and D0 worktree changes; all active L1 Sentry/logging worktrees; `docker/production/Dockerfile` and `.github/workflows/docker-publish.yml` except read-only static assertions.

## Verification

- Passed: `npm run agent:context`; `git status --short` (clean at start); repository inspection; Next.js 15.1.8 Context7 check for public environment variable build-time inlining; `npm run test:unit -- --runInBand src/__tests__/production-environment-contract.test.ts` (4/4); `npm run type-check`; `npm run lint -- --quiet`; `git diff --check`.
- Not run / still required: `npm run check:agent-handoffs`; final release-wide gates and CI Docker build on the merged SHA.

## Decisions and constraints

- Browser Sentry configuration is public but build-time: the current published image receives only `NEEDT_BUILD_SHA`, so documentation must make the missing image-build supply path explicit rather than falsely promising that a runtime Coolify variable enables it.
- Never put a secret in Docker build args or image `ENV`; source-map upload remains outside this scope.
- Do not run Docker, E2E, visual, or D0 commands.

## Blockers

- Enabling browser Sentry in CI needs owner-provisioned non-secret public configuration and an authorized follow-up pipeline change. It does not block this documentation/test unit.

## Next action

- Merge this scoped configuration unit into the L1 release line; do not configure external Sentry source-map upload without owner authorization.
