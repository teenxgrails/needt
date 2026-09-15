# Codex — what to do next on Needt

Rewritten 2026-09-15 and reconciled after the port merge on 2026-09-16. Branch
`codex/design-completion`.

| Fact, verified 2026-09-16 | Value |
| --- | --- |
| Integration commit | `ca2d034`; contains `origin/main` at `72eeef6` |
| Port history | 13 scoped commits from `082c9a6` through `ec89990`, plus merge `ca2d034` |
| Branch relation before this docs commit | 26 ahead, 0 behind `origin/main`; no tracked dirt |
| Gates at merge | `type-check` 0 · `lint` 0 · `tokens:check` 0 · unit tests 0 · build 0 |
| Migration `20260912000000_needt_design_data_layer` | written, **not applied** anywhere |

Read first: `CLAUDE.md` → `docs/handoff/PORT.md` →
`docs/handoff/design-reconciliation-2026-09-11.md` → `docs/plans/00-roadmap.md`.

---

## 0 · Before touching anything

```bash
npm run agent:context
```

- One writer per worktree. If another agent is in this checkout, stop.
- **Never `git add -A`.** The tree also holds `pnpm-lock.yaml` (the repo is
  npm-only), `_archive-figma-make/`, `_superseded/`, `pf-sync/`, the design
  bundle and trial fonts. Stage by path.
- **Never Neon.** `.env` and `.env.local` point `DATABASE_URL` at Neon with live
  data.
- **No deploy.** Never push `main` or `landing`; feature-branch pushes and draft
  PRs follow the launch goal.
- The `coolify` MCP server is read-only. Use it to read production state. Never
  ask for or use a token that can write.

## 1 · Port commits — complete

The port was split into scoped commits with gates green before each. The final
port-only commits are `082c9a6` through `ec89990`; no port source remains only
on disk.

## 2 · Merge `origin/main` — complete

Merge `ca2d034` contains `origin/main` at `72eeef6`. The schema, application
files, changelog and lockfile were reconciled; the required gates passed. The
pre-merge copy of plan 11 was merged back as a union and then updated by §3.

## 3 · Docs refresh — complete in this commit

The package at `~/Needt-handoff/2026-09-15-docs-refresh/APPLY.md` was applied
after the merge. Its stale pre-merge branch facts were reconciled with
`ca2d034`; the two drifted completed handoffs kept their newer verification
evidence. Superseded plans now live in `docs/_old/`, including
`docs/_old/12-codex-prompts.md`.

## 4 · Fix the task id before real data

`NeedtTask.id` and `blockedBy` are typed `number` because the prototype fixture
used numbers. The database uses cuid strings. `src/lib/needt/task-view.ts` folds
them through `hashTaskId` (FNV-1a). **That hash is one-way**: a screen cannot
turn it back into a task to save an edit.

- Widen `id` and `blockedBy` to `string` in `src/lib/needt/types.ts`.
- Delete `hashTaskId`; pass the cuid straight through.
- Make fixture ids strings; update every consumer under
  `src/components/needt/**` (type-check lists them).
- Keep `prototype-parity.test.ts` passing by comparing stringified ids.

## 5 · Apply the migration — local container only

```bash
npm run db:up
```

- Point `DATABASE_URL` at the local container. Check the URL, then
  `npx prisma migrate deploy`.
- `npx prisma migrate status` must list `main`'s Creem migrations as applied
  before `20260912000000_needt_design_data_layer`.
- Seed a few tasks and verify `prismaDataSource` returns them through
  `toNeedtTask` with the right fields.

## 6 · Replace the old screens (owner decision: in place, no `/v2`)

One screen per commit. For each:

1. Render the new screen inside a `.needt-v2` element carrying `data-theme`.
2. Read data server-side through `prismaDataSource`. No
   `src/components/needt/**` file imports Prisma.
3. **Delete the old component tree in the same commit.** Never leave two
   versions of a screen.

| Route | New | Delete |
| --- | --- | --- |
| `/today` | `home/Home` | `src/components/today/**` |
| `/calendar` | `calendar/CalendarScreen` | `src/components/calendar/**`, FullCalendar deps, the `.fc` blocks in `globals.css` |
| `/tasks`, `/projects` | `workspace/WorkspaceScreen` | `src/components/tasks/**`, `src/components/projects/**` |
| `/pages` list | `docs/DocsScreen` | only the list view; keep the editor |
| `/settings` | `settings/SettingsScreen` | old panels once each is covered |

Keep `/design-preview` until the last screen is swapped, then remove it and its
middleware line. When FullCalendar goes, drop it from the stack line in
`CLAUDE.md` and from the branding exception in `AGENTS.md`.

## Rules that apply to every step

- `docs/handoff/PORT.md` §0, §6, §8 are binding. Ask the owner before changing
  any of them.
- Never hand-edit `src/styles/needt-*.css`. Regenerate with
  `npm run tokens:sync`.
- Gates after every commit: `npm run type-check`, `npm run lint`,
  `npm run tokens:check`, `npm run test:unit`.
- `npm run test:visual` only with the dev server stopped.
- Motion can't be verified in the automated preview pane: it injects
  `data-animations="off"`. Check selectors, not computed `animation-name`.
- Add a `CHANGELOG.md` line under `[unreleased]` for each swapped screen.
- Open your own handoff for this workstream from
  `.agents/handoffs/_TEMPLATE.md`.

## Answered by the owner, 2026-09-15 — do not ask again

- **Prices:** Free $0 · Pro $7/month or $60/year · Lifetime $149 once, forever,
  first 300 buyers. AI limits exist but are never shown to users. Spec:
  `docs/plans/13-pricing.md`.
- **Trial:** Pro, 14 days, no card.
- **"Demo"** means the Free plan. No demo without an account.
- **Audience and teams:** one person's work and personal life, freelancers,
  small businesses, small teams through shared workspaces. No seat billing.

Prices and the trial are roadmap items P0.6 and P0.7. They are not part of the
port; do not build them on this branch.

## Still ask the owner

- People on tasks (holder, waits-on, faces): workspace members only, or outside
  contacts too? This decides what `TaskWait` points at.
