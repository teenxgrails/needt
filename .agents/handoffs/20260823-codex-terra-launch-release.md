---
id: 20260823-codex-terra-launch-release
owner: codex
branch: codex/terra-launch-l0
status: complete
updated: 2026-08-23T16:56:10Z
objective: Complete the Terra-owned CI gates, release documentation, task-model backlog, and the evidence-based /today error investigation on the Sol RC.
---

## Scope

- Governing plan/spec: `docs/plans/09-launch.md`; owner-provided Terra brief dated 2026-08-23.
- In scope: `.github/workflows/docker-publish.yml`, `docs/**`, launch handoff, CI tests needed for the workflow contract, and a narrowly evidenced `/today` error fix if one is local and testable.
- Out of scope: production deployment or account actions; secrets; Sol-owned `src/collaboration/**`, `package.json` build scripts, `next.config.js`, Docker runtime architecture, and Coolify configuration; dirty primary-checkout files.

## Completed

- Recovered an isolated `codex/terra-launch-l0` worktree from `codex/launch-l0 @ 2240f1f`; working tree is clean.
- Loaded the handoff and tool-routing protocols. Read-only CI, documentation, and `/today` audits are running in parallel.
- `98c9a8c ci(release): wire secure runtime gates` passes the three Sentry values through BuildKit `secrets:`, bounds the existing executable collaboration smoke, and polls all three service health endpoints after serialized redeploys. Focused workflow tests, full lint, and type-check passed.
- Read-only `/today` audit identified the unhandled browser fetch rejection in `WorkspaceProvider` bootstrap. The current fix catches it at the effect boundary, logs only the error type, and prevents logger failure from becoming another rejection; focused tests, full lint, and type-check passed.
- Ported the owner-approved Plan 11 task-model backlog from the dirty primary checkout into this isolated line. Documentation now records manual rollback policy, Sentry BuildKit upload, all-service SHA health, the `.mjs` collaboration command, L1.6 evidence, and the deferred email-verification policy choice.
- `b73fe22 docs(plans): capture task shape backlog` records the Plan 11/documentation unit. `cca8fac fix(workspaces): contain bootstrap fetch failures` records the `/today` workspace-bootstrap rejection fix and regression test.
- Merged Sol `92093f8` into this line. `4ab3830 ci(release): verify private runtime parity` removes the invalid public worker-health secret, makes empty Sentry source-map credentials fail before `docker/build-push-action`, and aligns CI/release docs with web's private `workerBuildSha` Redis heartbeat. The gates build remains credential-free: current Sentry behavior skips upload without credentials, while the publish image build is the fail-closed upload boundary.
- L1.6 is closed locally: the owner-provided rotation/swap observation and the existing request-log sanitization coverage together establish both persistence and no request logging of mail content, page content, or tokens. `/today` is also closed locally at `cca8fac`; the unhandled `TypeError: Load failed` was the unobserved workspace-bootstrap promise, now caught at the effect boundary with a no-PII reporter.

## Working state

- Files currently dirty or expected to change: this final handoff checkpoint only. Terra-owned CI, tests, and docs are committed through `4ab3830`; `/today` needs no further local code change without new Sentry evidence.
- Foreign changes that must remain untouched: all dirty files in `/Users/lol/Needt`; Sol-owned runtime/build paths above; `.agents/handoffs/20260823-codex-sol-runtime-release.md` is history, not an edit target.

## Verification

- Passed through `4ab3830`: `npm run agent:context`; focused workflow/environment/Docker/provider tests (33 tests); Node 22 type-check and lint; full unit suite (159 passed suites / 747 tests, 1 suite/test skipped); credential-free `npm run build` plus production-artifact scan; worker and collaboration builds; executable collaboration smoke; branding, UI-contract, and handoff checks; `git diff --check`. The credential-free web build confirms gates do not require Sentry upload credentials.
- Not run / still required: CI run with repository/environment secrets; production deploy/smoke; Docker-local gate excluded by plan; D0/launch E2E/visual waves excluded while Docker is unavailable.

## Decisions and constraints

- Pass Sentry values only through `docker/build-push-action@v6` BuildKit `secrets:`; never a build arg or image environment value. The publish job first rejects empty secret values, because an empty mounted file would let Sentry silently skip source-map upload.
- Manual rollback remains the approved policy; documentation must not claim a rollback hook exists or auto-rollback occurs.
- The existing Sol collaboration smoke is the authoritative executable check; Terra only wires it into CI and documents its role.
- Dated L1.6 evidence from the owner:

```
Дата проверки: 2026-08-23. Хост: root@needt (Coolify VPS).

/etc/docker/daemon.json:
  "log-driver": "json-file"
  "log-opts": { "max-size": "10m", "max-file": "3" }
  (плюс "default-address-pools" 10.0.0.0/8 size 24 — управляется Coolify,
   не трогать)

du -sh /var/lib/docker/containers  ->  34M

Крупнейшие json-логи:
  9.5 MB  519316a8...-json.log.1
  6.9 MB  519316a8...-json.log
  6.5 MB  96e1bbf6...-json.log
  5.4 MB  0308d315...-json.log
  3.4 MB  e5ffb191...-json.log

Вывод: ни один файл не превышает потолок 10m, присутствие .log.1 доказывает,
что ротация реально срабатывает, а не просто объявлена в конфиге. Рестарт
Docker и пересоздание контейнеров не потребовались.

Дополнительно 2026-08-23: добавлен swap 4 GB (/swapfile, прописан в
/etc/fstab). До этого swap отсутствовал при 7.6 GiB RAM и 4 ядрах, что было
причиной OOM в сборках Coolify.
```

## Blockers

- CI source-map upload and production verification require GitHub/Coolify execution and owner-managed secrets. The owner must ensure the deployed image receives the exact 40-character source SHA, confirm `NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL` is set as a Production environment secret, then execute `workflow_dispatch` and preserve Sentry-upload plus web/worker/collaboration convergence evidence. `NEEDT_PRODUCTION_WORKER_HEALTH_URL` is intentionally absent because worker health is private.

## Next action

- Owner/Terra release operator: confirm `NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL` in the Production environment, trigger `workflow_dispatch` for this merged SHA, and retain CI source-map upload plus web/worker/collaboration parity evidence before any production deploy.
