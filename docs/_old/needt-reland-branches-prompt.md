# Reland feat/timer + feat/board + feat/mobile onto main — Codex prompt

Запускай ПОСЛЕ того, как `feat/mail` смержен в main (чтобы реланд сел поверх Б + Mail).
Один прогон Codex, один интеграционный бранч, один PR. Codex сводит три стухшие ветки по очереди,
проверяя зелёный билд после каждой — если споткнётся на board, timer уже провалидирован.

---

```
Reconcile three stale feature branches with main: feat/timer, feat/board, feat/mobile. All three were
branched BEFORE the realtime worker pipeline (Задача Б) and the Mail feature landed on main. Relative
to current main they APPEAR to delete a lot of code, but they must NOT remove any of it — they simply
never had it. Files that these branches appear to "delete" and that you MUST preserve from main:
src/lib/queue/*, src/worker/index.ts, src/lib/calendar-webhooks/*, src/lib/google-sync.ts,
src/lib/realtime/*, src/app/api/stream/route.ts, src/app/api/webhooks/*, the CalendarWebhook Prisma
model + its migration, and the entire Mail module (src/app/api/mail/**, mail Prisma models, mail worker
handler, mail sidebar item). Never delete a Задача Б or Mail file.

GOAL: one integration branch off current main that contains ALL of: the realtime pipeline (Б), Mail,
the persistent focus timer (feat/timer), Boards (feat/board), and the mobile shell (feat/mobile).
Then open a single PR into main.

BRANCH COMMITS to bring in:
- feat/timer  -> 18601f9, 3068ab7  (FocusSession model, focus API, persisted timer store, live sidebar)
- feat/board  -> a718bce, eddf1c0  (Board/BoardColumn/SavedView models + API + store + card panel)
- feat/mobile -> c31d45f           (responsive shell, Today screen, bottom sheets — mostly UI, no model)

PROCEDURE (do it in stages, keep each stage green before the next):
1. From current main, create branch `feat/reland-all`.
2. Stage A — TIMER: bring in feat/timer's work (cherry-pick 18601f9 then 3068ab7, or merge). Resolve
   EVERY conflict by keeping main's Б/Mail code intact AND adding the timer feature. Then make green:
   lint (0 warnings), type-check, test:unit, build, build:worker.
3. Stage B — BOARD: bring in feat/board's work on top. Boards operate on the SAME Task model — do not
   create a parallel task system; keep the scheduling engine untouched. Resolve conflicts, green again.
4. Stage C — MOBILE: bring in feat/mobile's work on top (responsive layout only, same routes — no
   parallel mobile route tree). Resolve conflicts, green again.
5. Likely conflict files across stages: src/lib/outlook-sync.ts, src/hooks/use-admin.ts,
   src/components/tasks/TaskModal.tsx, src/components/settings/*, src/store/*, prisma/schema.prisma,
   src/components/navigation/AppNav.tsx (sidebar items from timer/board/mail/mobile must ALL coexist).
   Reconcile both sides every time; drop neither.
6. Prisma: the final schema must contain every model — CalendarWebhook (Б), Mail models, FocusSession
   (timer), Board/BoardColumn/SavedView + the Task board fields (board). Keep each feature's migration;
   ensure the full migration set applies cleanly on a FRESH database in order.
7. Follow CLAUDE.md conventions throughout (prisma singleton, @/lib/date-utils, logger+LOG_SOURCE,
   await params, house UI format). Update CHANGELOG.md under [unreleased].

FINAL ACCEPTANCE (all must pass): lint (0 warnings), type-check, test:unit, build, build:worker,
docker build, and `prisma migrate deploy` on a clean DB. Open ONE PR from feat/reland-all into main.
In the PR description, list per stage which conflicts you resolved and confirm no Б/Mail file was removed.
```

---

## Заметки
- Порядок: сначала смержи `feat/mail` в main, потом запускай этот промт (реланд сядет поверх всего).
- Один PR `feat/reland-all` → main. После мержа: `docker build` локально → push → Coolify redeploy **web + worker**.
- После этого main = Б + Mail + Timer + Board + Mobile. Тогда захардю **AI-AGENT** (ему нужны board/timer/mail API в main).
- Если Codex застрянет на board/mobile — timer/board уже зелёные в интеграционном бранче, не потеряются.
