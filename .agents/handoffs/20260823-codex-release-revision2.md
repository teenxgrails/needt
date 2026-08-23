---
id: 20260823-codex-release-revision2
owner: codex
branch: codex/terra-launch-l0
status: blocked
updated: 2026-08-23T18:36:45Z
objective: Reconcile revision-2 release work with origin/main before a separately approved production push.
---

## Scope

- Governing plan/spec: owner-provided release revision 2 dated 2026-08-23; `docs/plans/09-launch.md`.
- In scope: F1 unhealthy-production deploy recovery, F2 AMD64-only publish, F3 worker-heartbeat lifecycle, F4 bounded Redis health read, F5 self-host compose topology, merging `origin/main` into this branch, the full release gate set on the merge result, release documentation, and this handoff.
- Out of scope: any push or deploy until the reconciled branch has passed its gates; production secrets; D0/E2E/visual waves; GHCR migration; and unrelated product work.

## Completed

- F1: deploy recording now defaults unknown and validates a prior web SHA without preventing a repair deploy when health is down.
- F2: CI publishes native `linux/amd64` only and no longer initializes QEMU.
- F3/F4: worker heartbeat starts before lengthy mailbox setup, uses per-instance ownership plus atomic compare-and-delete on shutdown, and worker release reads fail fast when Redis is unavailable or stalls.
- F5: Compose now starts app, private worker, collaboration, PostgreSQL, and Redis with migration ordering, health checks (including a two-minute worker startup grace for IMAP), and container-local connection URLs; host development variables remain localhost.
- Documented the current Coolify source-commit setting name and release prerequisite.
- Owner confirmed Source commit availability by redeploying web; its live health reports a valid 40-character SHA instead of `local`. Owner also created the DNS-only collaboration A record.

## Working state

- Local implementation is committed on `codex/terra-launch-l0`: `4dc9994` (CI recovery/AMD64), `cf78082` (worker heartbeat health), `0b4084c` (Compose topology/docs), and `8405be0` (worker startup grace). No application source was changed outside the F1-F5 release scope.
- An isolated local worktree has an unpushed `main` at `3ba2dc7` from the earlier, now superseded fast-forward direction. It is not a promotion source and must not be pushed. `origin/main` is currently `db8f996d3ce26a3dc00a3a42e9ec6d23eedc5dca`.
- Remote configuration verified: `origin` is `github.com/teenxgrails/needt.git`; the old fork is named `fork-tlegros1` and its push URL is disabled.
- Foreign changes that must remain untouched: dirty `/Users/lol/Needt`; completed Terra and Sol handoffs; no Coolify configuration is represented in this repository.

## Verification

- Passed: focused regression tests (45 tests); `npm run type-check`; `npm run lint`; full unit suite (159 suites, 753 passed, 1 skipped); `npm run check:branding`; `npm run build:worker`; `npm run build:collaboration`; `npm run check:collaboration-runtime`; `npm run build` after reclaiming the current worktree's 3.3 GiB `.next` cache; `git diff --check`.
- Compose YAML/static contract passed. `docker compose config --quiet` could not run because this isolated worktree intentionally has no `.env`; it stopped before reading the config.
- Live check on 2026-08-23: `https://use.needt.app/api/health` returned `ok:true`, `db:ok`, and SHA `db8f996d3ce26a3dc00a3a42e9ec6d23eedc5dca`, proving the deployed web image has a real source commit. `https://collaboration.use.needt.app/health` did not resolve by DNS, so collaboration health/parity is not reachable or verified.
- Promotion checkpoint: public resolver `1.1.1.1` resolves `collaboration.use.needt.app` to `95.216.213.174`; the local resolver has not propagated it yet, and collaboration is expected to remain unavailable until its exited container is redeployed from this branch.
- Not run: launch E2E/visual suites and Docker image build are explicitly outside this revision scope. Owner verification of the three Coolify resource settings and production health/parity remains required.

## Decisions and constraints

- Never push to `main` before the owner verifies all three Coolify services inject a real source commit during build; auto-deploy otherwise turns a code push into a production outage.
- Worker health remains private. Do not add `NEEDT_PRODUCTION_WORKER_HEALTH_URL` or expose port 1235.
- Coolify source commit availability resolves the current `local` build identity without requiring an immediate GHCR migration. GHCR remains a later optimization, not a release prerequisite.

## Blockers

- Owner instruction: do not push until `origin/main` has been merged into this branch and the full release gate set passes on the resulting SHA. The eventual target command is `git push origin main`, and it still requires separate explicit authorization. Never push to `fork-tlegros1`.

## Next action

- Fetch `origin/main`, merge it into `codex/terra-launch-l0`, resolve the known package/workflow conflicts, run the full gates on that merge SHA, and present the verified result for a separate authorization of `git push origin main`.
