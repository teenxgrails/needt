# Ночной промт для Opus (автономный прогон, ~8 часов)

Вставь целиком. Учтено: задача Б НЕ сделана → MAIL и всё realtime не запускать; Nango не поднят → TODO-SYNC не запускать; деплой ночью запрещён.

```
You are running unattended overnight (~8 hours) in this repository. The owner is asleep and cannot answer questions. Work autonomously under these hard rules:

HARD RULES:
- NEVER deploy, push to main, force-push, rebase shared branches, or touch production (Coolify/Neon). No `prisma migrate deploy` against remote DBs; use `prisma migrate dev` locally only.
- Each feature goes on its OWN branch off the latest main: feat/timer, feat/mobile, feat/board. Commit in small logical steps with clear messages. Do not merge branches into main.
- Quality gate after EVERY feature before moving on: `npm run lint` (zero warnings), `npm run type-check`, `npm run test:unit`, `npm run build`. If a gate fails and you cannot fix it within a reasonable number of attempts, commit WIP with a "WIP:" prefix, write down what is broken, and move to the next feature. Never leave a branch in a state that breaks main if merged blindly — if unsure, note it.
- If a decision is ambiguous, pick the conservative option, add a //todo comment, and log the decision. Do not invent new scope.
- Do NOT start these (blocked by missing infra): Task Б (BullMQ/Redis/webhooks/SSE — not deployed yet), MAIL (depends on Б), TODO-SYNC (Nango not set up). Do not add Redis or worker code.

CONTEXT: Read CLAUDE.md and design-refs/ui-conventions.md first and follow all conventions strictly (prisma singleton, date-utils, logger with LOG_SOURCE, requireAdmin, shadcn house format, Next 15 params-as-Promise). The FIX prompt was already executed by another agent — verify its changes are present on main before branching; if FIX work is unfinished (e.g. Flowday strings remain, root "/" still shows legacy landing), finish it first on branch fix/leftovers.

QUEUE (execute in this order, one branch each):

1. TIMER — full prompt below under «ПРОМТ TIMER». Independent of everything, do it first.
2. MOBILE — full prompt below under «ПРОМТ MOBILE».
3. BOARD — full prompt below under «ПРОМТ BOARD». This is the largest one; split into two commits phases: (a) Prisma schema + API routes + store, (b) UI. If you run out of time mid-BOARD, stop at a green (a) with UI stubbed behind a clearly named //todo.
4. ONLY IF ALL THREE ARE GREEN and time remains: on branch feat/quick-add-route, add a minimal /quick-add route: a single-input page that calls the existing brain-dump parsing endpoint and creates tasks; house format; no new dependencies.

FINAL STEP (mandatory, even if features are unfinished): create NIGHT-REPORT.md in the repo root with: per-branch summary (what's done, what's WIP), quality-gate results per branch, decisions made with reasoning, known issues / things that need the owner's review, and a recommended merge order. Commit it to the last active branch.
```

После этого блока вставь в ту же сессию тексты промтов TIMER, MOBILE и BOARD из NEEDT-PROMTY.md (разделы 4, 4.2, 1) под заголовками «ПРОМТ TIMER», «ПРОМТ MOBILE», «ПРОМТ BOARD».

```

```
