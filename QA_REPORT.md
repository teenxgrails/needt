# QA Report — Mina Design Parts 1-6

Date: 2026-07-08

## Build, Type, Test

- PASS: `pnpm prisma validate` with `DATABASE_URL` and `DIRECT_URL` set to local Postgres URL.
- BLOCKED: `pnpm prisma migrate deploy` against fresh local DB. The environment has no reachable Postgres on `localhost:5432`, and `docker` is not available in this shell.
- PASS: `pnpm tsc --noEmit`.
- PASS: full Jest suite via `pnpm jest --runInBand`: 39 suites passed, 1 skipped; 276 tests passed, 1 skipped.
- PASS: `pnpm build`. Build completed. Observed expected warnings while Postgres was unavailable during static collection, plus the pre-existing standalone trace warning for `/api/task-sync/sync`.

## Runtime Smoke

- PASS: dev server booted at `http://localhost:3000` and LAN `http://192.168.178.23:3000`.
- PASS: `GET /manifest.webmanifest` returned 200 on localhost and LAN address.
- PASS: `GET /setup`, `GET /auth/signin`, and `GET /style` returned 200 on localhost.
- PASS: manifest parses as JSON and includes Mina icon plus dark splash/theme colors.
- BLOCKED: fresh DB setup account creation, task creation, auto-schedule persistence, focus session persistence, calibration rendering, connector task creation, offline queued sync. These require a running Postgres database; Docker is not installed/exposed and local port 5432 is unreachable from this environment.
- NOT AVAILABLE: browser console/runtime visual QA. Playwright is not installed in this workspace, so I could not capture browser console output or screenshots from an actual rendered tab. HTTP smoke showed no PWA `navigator.serviceWorker` crash; server logs only showed database-unreachable errors.

## Fixes Made During QA

- Added direct `gaxios` dependency because app code imports it directly and pnpm strict module layout does not expose transitive packages.
- Added direct dev `yaml` dependency because the Docker quickstart test imports it directly.
- Regenerated Prisma Client after the pnpm dependency restore so new schema models/enums are reflected in TypeScript.

## Notes

- `pnpm install --no-frozen-lockfile --ignore-scripts` was used to restore `node_modules` after `pnpm prisma validate` attempted an install and removed the old shims. Lifecycle scripts were disabled because Homebrew Node 26 cannot compile `better-sqlite3@11.10.0`; the QA toolchain itself ran cleanly under the bundled Node runtime.
- A full end-to-end pass should be rerun on a machine/session with Docker or local Postgres available: `docker compose up -d db`, `pnpm prisma migrate deploy`, then the runtime checklist.
