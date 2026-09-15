# 00 — Roadmap

The one map. Every other plan in this folder is a chapter of it; this file says
what is true today, what is left, and in what order.

**Rewritten 2026-09-15** against state verified that day: production health,
the Coolify API (read-only token), `git` and `gh`. It replaces the 2026-08-27
version, whose design section described a system that no longer exists.

---

## 1. Where things stand

### Production

| Service | State, 2026-09-15 | How checked |
| --- | --- | --- |
| `use.needt.app` web | live, **`72eeef6`** since 2026-09-15 22:59 UTC, database ok | `/api/health` |
| worker | live, same SHA `72eeef6` | `/api/health` → `workerBuildSha` |
| `collaboration.use.needt.app` | HTTP 200 | curl |
| `needt.app` landing | live, static, deployed from branch `landing`. Shows $6 / $60 / $79 (was $149), "first 100 people", "14 days · no card" | curl, Coolify |
| `www.needt.app` | 301 to the apex | curl |
| Postgres and Redis | running, healthy | Coolify API |
| Database backups | daily, last success 2026-09-15; weekly, last success 2026-09-13; both to S3. **Never restored** | Coolify API |
| Last deploy of any app | 2026-09-15: web, worker and collaboration all moved to `72eeef6`. Web crashed once at 22:33 UTC and restarted itself while worker and collaboration built in parallel; the whole host stopped answering HTTP for about 20 minutes | Coolify API, curl |
| Coolify service `metamcp` | exited | Coolify API |

Not checked on 2026-09-15: production environment variables, because the
read-only token has no `read:sensitive`. P0.3's VAPID state is as last recorded
on 2026-08-24.

### Code

| Line | State |
| --- | --- |
| `origin/main` | `72eeef6` (2026-08-26), deployed to production on 2026-09-15. It carries billing hardening (#27), the `/admin/system` credentials screen (#26) and the Linux visual baselines (#21, #22) |
| `codex/design-completion` | The design port, owned by Codex. Merge `ca2d034` contains `origin/main`; before this docs commit it was 26 commits ahead, 0 behind, with no tracked dirt |
| Open PRs | #24 push config (audited, fails) · #29 design reference set · #30 T-4 answers · #31 D7 concepts · #32 React landing · #33 the previous roadmap |

### The design

Replaced wholesale on 2026-09-11 by a Claude Design project. Authority, in
order: `docs/handoff/PORT.md`, then
`docs/handoff/design-reconciliation-2026-09-11.md`, then the vendored CSS.

The port is built and committed but not on any product route: tokens scoped
under `.needt-v2`, five themes, the data contract in `src/lib/needt/`, the screens
in `src/components/needt/`, all rendered only at
`/design-preview`. `/DESIGN.md`, `design-refs/`, Figma and Figma Make are
history.

---

## 2. Owner decisions, 2026-09-15

| Question | Decision |
| --- | --- |
| Prices | Free $0 · Pro $7/month or $60/year · **Lifetime $149 once, forever, first 300 buyers, then it closes** |
| Trial | Pro, 14 days, **no card**; afterwards the account drops to Free and keeps its data |
| AI limits | Enforced but **never shown** to users. Pro and Lifetime get the same allowance; past it, AI slows down and suggests the user's own key |
| "Demo" | Means the Free plan. There is no demo without an account |
| Audience | One person's work and personal life, freelancers, small businesses, small teams |
| Teams | Small teams through shared workspaces (the plan 02 model). Each member holds their own plan; no seat billing |
| Old plans | This roadmap governs. Plans 03, 05, 09, 10 and 12a are archived to `docs/_old/` |

The €9 / €180 / "20 months" figures in older landing drafts are wrong.

---

## 3. What is left

### A — Design port

Owned by Codex. Steps and rules: [`docs/handoff/CODEX-NEXT.md`](../handoff/CODEX-NEXT.md).

1. **Done:** commit the port in path-scoped commits.
2. **Done:** merge `origin/main` as `ca2d034` and pass the merge gates.
3. **Done in this commit:** apply the 2026-09-15 docs refresh, including this file.
4. Widen the task id from `number` to `string` and delete `hashTaskId`.
5. Apply the migration to the local container only. Never to Neon.
6. Swap the screens in place, one per commit, deleting each old tree and the
   legacy calendar implementation with the calendar tree.

### B — Blocking the first paying user

Detail and verification steps live in
[`12-remaining-work.md`](12-remaining-work.md). None of this runs in the port
checkout: use a separate worktree from `origin/main`.

| ID | Item | State, 2026-09-15 | Who |
| --- | --- | --- | --- |
| — | Deploy `main` | **Done 2026-09-15**: web, worker and collaboration on `72eeef6` | — |
| P0.1 | Google and Azure credentials screen | Deployed 2026-09-15; `/admin/system` is reachable. **Secrets still not entered** | owner |
| P0.2 | Billing lifecycle spec, `tests/billing.spec.ts` | Lifecycle hardened in #27; spec not rechecked | agent |
| P0.3 | Push reminders fail silently (VAPID) | Not rechecked; fix PR #24 was audited as failing | agent, owner for keys |
| P0.4 | Account deletion and data export | **Missing.** No deletion route in `src/`; `src/app/api/export/` holds `tasks` only | agent |
| P0.5 | One row per Creem subscription; refund and dispute events | Not started | agent |
| **P0.6** | **14-day Pro trial without a card** | **Missing.** No trial logic in `src/`, yet the live landing promises it | agent; owner decides whether the landing line comes off until it ships |
| **P0.7** | **Prices and hidden AI limits** | `src/lib/creem/config.ts` says $6 and $79; the Lifetime AI cap is 3000 against Pro's 300; AI counts are shown in four places; the live landing says $79 and "first 100". Whether the checkout enforces the 300 cap is not checked. Spec: [`13-pricing.md`](13-pricing.md) | agent for code and landing; owner for the Creem prices |
| P1.2 | First run on a clean database, `tests/onboarding.spec.ts` | Waits on P0.1 | agent |
| P1.3 | Close the stale handoffs | **Done 2026-09-15** | — |
| P1.4 | Restore drill | Backups succeed; never restored | agent |
| P1.5 | Legal copy | After P0.4 | owner |
| P2 | Alerting, funnel signal, release rehearsal, Sentry | Not started | agent |

Carried over from the handoffs closed on 2026-09-15:

- Browser E2E journeys for the S11/T8 features — Saved Views, reschedule
  preview, health journal. The release-boundary audit found only unit coverage.
- `/mail` in the visual suite. The focused-splits handoff never saw that route
  pass; confirm it against the Linux CI baselines.
- **Builds must not run in parallel on the production host.** Deploying worker
  and collaboration together on 2026-09-15 took the whole box off the network for
  about 20 minutes and crashed web once — the same failure as 2026-08-23. Either
  deploy one app at a time, or move builds to GitHub Actions (P2.3).

### C — Landing

- Copy for Claude Design: `landing/for-claude-design/CLAUDE-DESIGN-COPY-PROMPT.md`,
  corrected on 2026-09-15 to the decisions in §2.
- `download.html` in the Claude Design project claims native desktop apps and
  local data. The repository has neither; the prompt carries the fix.
- The live landing on branch `landing` changes its prices with P0.7.
- PR #32, the React landing: its fate is an owner question, see §5.

### D — Product backlog, after a stable production week

- Plan 11: T-1 progress counter and part-cut, T-2 mini-entry, T-4 value-bearing
  groups.
- T-3 streaks is settled by the design: habits count kept days out of the last
  14, never a streak.

---

## 4. Order

1. **Now.** Open the design-port draft PR, then complete A4 and A5 against the
   local container only. The owner may enter Google and Azure secrets at
   `/admin/system`; agents do not touch them.
2. **Next.** P0.7, P0.6, P0.4, P0.3 and P1.2, each in its own worktree from
   `origin/main`. P0.2 is already covered by merged PR #27; revalidate rather
   than duplicate it.
3. **Then.** A6, one screen at a time, after its launch-blocker dependencies;
   P0.5 and P1.4 remain separate workstreams.
4. **Before telling anyone the product exists.** P1.5, P2, and the landing in C.
5. **After a stable week.** D.

---

## 5. Only the owner

- Enter the Google and Azure client secrets at `/admin/system`, then connect a
  real calendar and watch events land in `CalendarEvent`.
- Set the Creem products to Pro $7/month ($60/year unchanged) and Lifetime $149.
  Confirm the Swiss-seller tax fields.
- Approve the legal copy. Record the Google OAuth verification video (not a
  launch blocker).
- Decide the open PRs: close #29, #31 and #33 as superseded by the port and this
  roadmap? #30 — its T-4 answers are already in `11-task-model.md` on the port
  branch. #32 — keep the React landing, or replace it with the Claude Design one?
- Decide `metamcp` on Coolify: delete or restart.
- Decide people on tasks (holder, waits-on, faces): workspace members only, or
  outside contacts too?

---

## 6. Not authorized

Unchanged: no new AI scheduler, no seat billing, no cross-workspace views, no
third-party document storage, no physical deletion of user content, no read
receipts, no team snippets, no Notion-style automation, no portfolio management,
no audio transcription, no new integrations.

---

## 7. Where things live

| Need | File |
| --- | --- |
| Launch blocker detail | [`12-remaining-work.md`](12-remaining-work.md) |
| Prices, trial, AI limits | [`13-pricing.md`](13-pricing.md) |
| Design port steps | [`docs/handoff/CODEX-NEXT.md`](../handoff/CODEX-NEXT.md) |
| Design values, and why | `docs/handoff/PORT.md`, `docs/handoff/design-reconciliation-2026-09-11.md` |
| Plan index | [`README.md`](README.md) |
| Archived plans | `docs/_old/` |
