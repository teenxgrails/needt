# Needt — QA / bug-sweep / hardening — Codex prompt — 2026-07-18

Ветка `feat/qa-hardening` от актуального main (в нём уже Б + Mail + Timer + Board + Mobile + AI-agent после мержей).
Скопируй блок «CODEX PROMPT».

---

## CODEX PROMPT

```
Do a QA + hardening pass over the current app. Branch from current main (it now integrates the realtime
pipeline, Mail, Focus timer, Boards, mobile shell, and the AI agent — much of it recently merged via a
large reland). GOAL: find and fix real bugs and fragility introduced by the integration and left over
from earlier phases. Do NOT add new features, do NOT redesign UI, do NOT modify the scheduling engine
(src/services/scheduling/). Follow CLAUDE.md conventions. Update CHANGELOG.md under [unreleased].

STEP 1 — GATES: run and make fully green, fixing root causes (not by deleting tests):
lint (0 warnings), type-check, test:unit, build, build:worker, docker build. Report anything that was red.

STEP 2 — INTEGRATION CORRECTNESS (from the big merge): audit the files that were conflict-resolved and
the surfaces where features coexist. Verify and fix:
- src/components/navigation/AppNav.tsx: Today, Calendar, Workspace, Focus (live timer), Boards, and the
  Mail item + unread badge all render, route correctly, and don't overlap/duplicate.
- Boards operate on the SAME Task model as the scheduler (no parallel task system); moving/creating a
  board card doesn't corrupt scheduling fields.
- src/lib/outlook-sync.ts, src/hooks/use-admin.ts, src/components/tasks/TaskModal.tsx and any other merged
  file behave correctly (no half-merged logic, no dead code, no duplicated handlers).
- prisma/schema.prisma is coherent; all migrations apply cleanly and in order on a FRESH database
  (CalendarWebhook, Mail, FocusSession, Board/BoardColumn/SavedView, AgentMemory, AiUsage).

STEP 3 — RUNTIME ROBUSTNESS: the app must build and run when optional integrations are NOT configured.
- No module-import-time crashes on missing env (Stripe, AI keys, Google/Outlook creds, Redis for enqueue
  in the web process). Unconfigured providers show neutral "not configured" states, never red errors or
  crashes. Guard any getter that throws at import.
- No hydration mismatches (SSR vs client) on the main authenticated routes; make time/date/random content
  deterministic or client-only.
- Add error boundaries / graceful fallbacks where a single feature failing (e.g. Mail sync, SSE stream)
  could otherwise blank the page.
- No unhandled promise rejections in server routes; every route logs via logger+LOG_SOURCE and returns a
  sane status on error.

STEP 4 — VERIFY THE KNOWN AUDIT BUGS (check each in the CURRENT code; fix if still present, note if already fixed):
1. Auth-state flash: sidebar avatar briefly empty / "Sign In" right after login — single session source, skeleton while loading.
2. Focus session persistence: timer must survive navigation and full reload (should be fixed by the timer work — verify end to end).
3. Quick-create popover opening by itself on first load of /calendar (slot-select firing on mount).
4. Timeline view: completed tasks rendered as detached grey blocks outside grid rows.
5. AI Chat pill in sidebar opens the panel on click (not only via shortcut).
6. Settings > Calendars: red "Missing Credentials" banners for unconfigured providers → neutral empty state + disabled Connect.
7. Any leftover placeholder copy in prod (e.g. Focus "Soundscape…"), stray "Flowday" strings.

STEP 5 — SANITY on mobile (viewport 375 and 768): no horizontal body scroll; bottom tab bar + Today screen
work; modals become bottom sheets; Board scrolls horizontally; Space shows a "best on desktop" placeholder.

DELIVERABLE: fixes committed on feat/qa-hardening; a short report in the PR description grouped as
Found→Fixed / Already-fine / Deferred(//todo). All gates green; migrations clean on fresh DB. One PR into main.
Add regression unit tests for any non-trivial bug you fix.
```

---

## Заметки
- Явно запрещено: новые фичи, редизайн, правка движка расписания — чтобы Codex не ушёл в рефактор.
- Пункты аудита — из `NEEDT-MASTER-PLAN.md` §1; часть могла уже закрыться (таймер/FIX), поэтому «проверь → почини, если живо».
- После мержа: docker build → push → Coolify redeploy web+worker → смоук.
