---
id: 20260823-codex-sol-runtime-release
owner: codex
branch: codex/launch-l0
status: active
updated: 2026-08-23T11:49:56Z
objective: Restore release-correct collaboration runtime and close the locally implementable Sol deployment-safety gaps on one verified release SHA.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md` L0.4 and L1; owner-provided Sol runtime brief dated 2026-08-23.
- In scope: merge the prepared environment-contract branch; collaboration executable smoke and startup fixes; service SHA parity and entrypoint checks; GHCR runtime contract; Resend/reminder diagnostics; Sentry source-map cleanup without secret build args; focused and release gates.
- Out of scope: production deployment/data operations, production credentials or account changes, `docs/**` and `.github/workflows/**` edits owned by Terra, D0/launch E2E/visual waves, and unrelated product changes.

## Completed

- Recovered the clean `codex/launch-l0` worktree at `3d53ba5`, audited concurrent handoffs, and confirmed the prepared `codex/launch-l1-config` branch is exactly two commits ahead.
- Fast-forwarded `codex/launch-l1-config` to `0068fcb`; type-check, lint, and the full unit suite passed. Tagged this verified-but-not-deployable baseline as `v0.4.1-rc.1` because the known collaboration P0 was still open.
- Replaced the static-only collaboration check with an executable bundle smoke. The smoke failed first against the production-like ESM bundle with `Dynamic require of "util"`, then passed after injecting a real Node `require` through an aliased `createRequire` banner.
- Collaboration remains ESM at `dist/collaboration/index.mjs`; startup now sets `process.exitCode = 1` before logging/flushing a rejected `listen()`. The smoke proves both a successful TCP accept and a nonzero exit when the port is occupied.
- `900de03 fix(collaboration): verify executable runtime` records the complete S1 unit.
- Aligned every owned runtime/check command with `dist/collaboration/index.mjs`, restored the shared entrypoint on the root worker stage, and exposed worker release health on port 1235. The shared GHCR runner keeps `/app/entrypoint.sh` for web and both command overrides, so DB wait and runtime migration-skip behavior are preserved.
- Added public, content-free release health for worker and collaboration plus `npm run check:runtime-shas`, which polls web/worker/collaboration health URLs until all report the exact `DEPLOY_SHA` or fails closed. Local harnesses proved both convergence and a stale-worker failure.

## Working state

- Files currently dirty or expected to change: S2/S3 runtime contract and focused tests pending commit; then S4 email contract and S5 source-map files. Terra must separately reconcile the stale `.js` command in `docs/deploy.md` and wire `check:runtime-shas` into `.github/workflows/docker-publish.yml` after the worker/collaboration health URLs exist.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; all D0 files; Terra-owned `docs/**` and `.github/workflows/**` except the already-reviewed commits being merged unchanged from `codex/launch-l1-config`.

## Verification

- Passed: `npm run agent:context`; bootstrap/ownership audit; config-merge `npm run type-check`, `npm run lint`, `npm run test:unit` (154 passed suites / 712 passed tests, 1 suite/test skipped); Node 22.16.0 `npm run build:collaboration`; Node 22.16.0 `npm run check:collaboration-runtime`; post-S1 Node 22.16.0 type-check and lint; `git diff --check` before formatting.
- Expected red proof: the new runtime smoke exited 1 against an ESM bundle without the banner at `Dynamic require of "util"`.
- Passed for S2/S3 on Node 22.16.0: type-check; lint; focused Docker/worker-health unit tests (2 suites / 17 tests); worker build; collaboration build and executable smoke; entrypoint shell syntax; runtime-SHA harness success when all three match and expected failure when worker is stale; `git diff --check`.
- Not run / still required: focused S4-S5 checks; full unit/build/release gates after all Sol changes; Docker/GHCR CI; Terra workflow integration of collaboration smoke and runtime SHA parity.

## Decisions and constraints

- Work only in `/private/tmp/needt-launch-l0`; preserve the dirty primary checkout.
- Keep collaboration as ESM and bridge CommonJS dynamic requires with `createRequire`; do not silently revert the release-speed change to CommonJS.
- Alias the banner import as `__createRequire`: the literal unaliased banner collides with a generated `createRequire` import later in the bundle. Runtime semantics are unchanged and the executable smoke covers the dynamic `util`, `crypto`, and other CommonJS paths reached during startup.
- No source-map token in Docker build args or image layers; production/external operations remain owner-only.
- Runtime SHA parity uses per-service health responses containing only service name and build SHA; it does not expose queue, user, or environment data. Worker health is ready on port 1235; collaboration health uses `/health` on its existing port 1234.

## Blockers

- None for the local implementation scope. Docker daemon, D0, launch E2E, and visual work are intentionally excluded from this session.

## Next action

- Commit the S2/S3 runtime contract, then make Resend sender configuration fail fast with focused tests and record the external domain/queue checks for the owner.
