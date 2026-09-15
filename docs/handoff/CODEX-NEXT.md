# Codex — what to do next on Needt

State checked 2026-09-14 on branch `codex/design-completion`, HEAD `608e40f`.

| Fact | Value |
|---|---|
| Uncommitted paths | **172** — the whole design port lives only on disk |
| Gates | `type-check` 0 · `lint` 0 · `tokens:check` 0 |
| Unit tests | 1159 passed, 1 skipped |
| Migration `20260912000000_needt_design_data_layer` | written, **not applied** anywhere |

Read first: `CLAUDE.md` → `docs/handoff/PORT.md` → `docs/handoff/design-reconciliation-2026-09-11.md`.

---

## 0 · Before touching anything

```bash
npm run agent:context
```

- One writer per worktree. If another agent is in this checkout, stop.
- **Never `git add -A`.** The tree also holds `pnpm-lock.yaml` (repo is npm-only), `_archive-figma-make/`, `_superseded/`, `pf-sync/`, the design bundle and trial fonts. Stage by path.

## 1 · Commit the port — do this first

Nothing since `608e40f` is committed. One lost disk and the port is gone. Split into reviewable commits, gates green before each:

1. Token vendoring + guards: `scripts/sync-design-tokens.mjs`, `scripts/check-design-tokens.mjs`, `src/styles/needt-*.css`, `package.json` scripts, `src/app/globals.css`.
2. Gate fixes: `tsconfig.json` and `eslint.config.mjs` excludes.
3. Five themes: `src/lib/theme-init.ts`, `src/lib/theme.ts`, `src/app/layout.tsx`, `src/types/settings.ts`, `ThemeProvider`, `ThemeToggle`, their tests.
4. Data contract: `src/lib/needt/**`.
5. Components: `src/components/needt/**`, `src/app/design-preview/**`, the `/design-preview` line in `src/middleware.ts`.
6. Licensed font: `public/fonts/ExposureVAR.woff2` + `README.md` + the two `@font-face` blocks. The file's name records say "Trial"; 205TF support confirmed it is the file to use — the README says so.
7. Schema + migration: `prisma/schema.prisma`, the migration folder.
8. Docs: `CLAUDE.md`, `docs/handoff/**`, superseded banners in `DESIGN.md` and `design-refs/`, `.gitignore`.

Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## 2 · Fix the task id before real data

`NeedtTask.id` and `blockedBy` are typed `number` because the prototype fixture used numbers. The database uses cuid strings. `src/lib/needt/task-view.ts` folds them through `hashTaskId` (FNV-1a). **That hash is one-way**: a screen cannot turn it back into a task to save an edit.

- Widen `id` and `blockedBy` to `string` in `src/lib/needt/types.ts`.
- Delete `hashTaskId`; pass the cuid straight through.
- Make fixture ids strings; update every consumer under `src/components/needt/**` (type-check will list them).
- Keep `prototype-parity.test.ts` passing by comparing on stringified ids.

## 3 · Apply the migration — local container only

```bash
npm run db:up
```

- Point `DATABASE_URL` at the local container, then `npx prisma migrate deploy`.
- **Never run it against Neon.** Local dev points at the cloud database by default; check the URL before running.
- Seed a few tasks and verify `prismaDataSource` returns them through `toNeedtTask` with the right fields.

## 4 · Replace the old screens (owner decision: in place, no `/v2`)

One screen per commit. For each:

1. Render the new screen inside a `.needt-v2` element carrying `data-theme`.
2. Read data server-side through `prismaDataSource`. No `src/components/needt/**` file imports Prisma.
3. **Delete the old component tree in the same commit.** Never leave two versions of a screen.

| Route | New | Delete |
|---|---|---|
| `/today` | `home/Home` | `src/components/today/**` |
| `/calendar` | `calendar/CalendarScreen` | `src/components/calendar/**`, FullCalendar deps, the `.fc` blocks in `globals.css` |
| `/tasks`, `/projects` | `workspace/WorkspaceScreen` | `src/components/tasks/**`, `src/components/projects/**` |
| `/pages` list | `docs/DocsScreen` | only the list view; keep the editor |
| `/settings` | `settings/SettingsScreen` | old panels once each is covered |

Keep `/design-preview` until the last screen is swapped, then remove it and its middleware line.

## Rules that apply to every step

- `docs/handoff/PORT.md` §0, §6, §8 are binding. Ask the owner before changing any of them.
- Never hand-edit `src/styles/needt-*.css`. Regenerate with `npm run tokens:sync`.
- Gates after every commit: `npm run type-check`, `npm run lint`, `npm run tokens:check`, `npm run test:unit`.
- `npm run test:visual` only with the dev server stopped.
- Motion can't be verified in the automated preview pane: it injects `data-animations="off"`. Check selectors, not computed `animation-name`.
- Add a `CHANGELOG.md` line under `[unreleased]` for each swapped screen.

## Ask the owner, don't guess

- The Life plan: lifetime or 20 months of Pro?
- Does payment really need no card until day 14?
- Does the demo open without an account?
- Teams: shared view for small teams, or single-user only?
