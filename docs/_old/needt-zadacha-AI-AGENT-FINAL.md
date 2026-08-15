# Needt — AI-AGENT (app-wide copilot), FINAL Codex prompt — 2026-07-18

Запускать ПОСЛЕ мержа `feat/reland-all` в main (агенту нужны board/focus/mail API в main).
Скопируй блок «CODEX PROMPT». Ниже — сверка с кодом.

---

## Сверено с кодом (feat/reland-all)

- **Агент уже есть, НЕ переписывать:** `src/app/api/ai/chat/route.ts` — тулзы объявляются в `toolDefinitions()`,
  исполняются в `executeTool()` (dispatch по `call.name`), опасные — `isDangerousTool()` (сейчас
  `delete_task`, `auto_schedule`) с ответом `confirmation_required`. Типы `AIChatToolDefinition`/
  `AIChatToolCall` в `src/services/ai/types.ts`. Провайдеры/BYOK — `src/services/ai/{providers,settings}.ts`,
  шифрование ключей — `src/services/ai/encryption.ts` (`encryptSecret`/`decryptSecret`, env `AI_ENCRYPTION_KEY`).
  Существующие тулзы: `create_task`, `edit_task`, `delete_task`, `query_schedule`, `parse_brain_dump`, `auto_schedule`.
  История — модели `AiConversation`/`AiMessage`.
- **Сервисы для тонких обёрток:**
  - Boards: `src/services/boards/boardService.ts` → `listBoards`, `getBoard`, `createBoard`, `createColumn`, `moveCard`, `updateColumn`, `reorderColumn`.
  - Focus: `src/services/focus/focusSession.ts` → `startSession`, `finalizeSession`, `getActiveSession`; stats `src/services/focus/focusStats.ts` → `getWeeklyFocusReport`, `recomputeFocusStats`.
  - Mail: модуль `src/app/api/mail/**` + mail-сервис (read-only + «task from email»).
  - Scheduling: `scheduleAllTasksForUser` в `@/services/scheduling/TaskSchedulingService` (движок НЕ трогать).
- **Моделей `AgentMemory` и `AiUsage` НЕТ** — их добавляет этот промт. `AISettings` (BYOK) уже есть.

---

## CODEX PROMPT

```
Extend the EXISTING AI agent into an app-wide copilot. Branch from current main (it now contains the
realtime pipeline, Mail, Boards, Focus timer). Read src/app/api/ai/chat/route.ts and src/services/ai/*
FIRST. Do NOT rewrite the agent core, and do NOT modify the deterministic scheduling engine
(src/services/scheduling/) — the agent only calls it. Follow CLAUDE.md conventions (prisma singleton,
@/lib/date-utils, logger+LOG_SOURCE, await params, house UI format). Update CHANGELOG.md under [unreleased].

The agent already defines tools in `toolDefinitions()`, executes them in `executeTool()` (dispatch by
call.name), marks dangerous ones in `isDangerousTool()` (currently delete_task, auto_schedule) with a
`confirmation_required` response, and stores history in AiConversation/AiMessage. EXTEND these — same
patterns, same types (AIChatToolDefinition/AIChatToolCall). Every new tool is a thin, Zod-validated,
server-side wrapper over the existing service listed below; operate strictly on the authenticated user's data.

PART 1 — TOOL COVERAGE (thin wrappers, no new business logic):
- Boards (wrap src/services/boards/boardService.ts): list_boards→listBoards, query_board→getBoard,
  create_board→createBoard, create_column→createColumn, move_card→moveCard(userId, taskId, columnId, position).
- Focus (wrap src/services/focus/*): start_focus_session→startSession, stop_focus_session→finalizeSession,
  get_focus_stats→getWeeklyFocusReport / recomputeFocusStats.
- Mail (wrap the existing mail module; READ-ONLY + task creation, the agent must NEVER send mail):
  search_mail, get_message, create_task_from_email.
- Settings: get_user_settings, update_work_hours, update_scheduling_preferences (confirmation required).
- Keep existing task/schedule tools as-is. Register every dangerous tool (update_*, delete_*) in
  isDangerousTool so it reuses the existing confirmation flow. Keep the tool catalog in ONE place so new
  tools register in a single spot.

PART 2 — USER MEMORY:
- Prisma model AgentMemory: id, userId, kind (preference|pattern|goal|fact), content (short text),
  source (chat|inferred), weight Float, createdAt, lastUsedAt. Cap 100 entries/user (LRU eviction by lastUsedAt).
- Tools: remember(kind, content), forget(memoryId), list_memories.
- Assemble the system prompt per request in ONE function with a token budget: base guidance + top-N
  memories (by weight/recency) + today's schedule summary (reuse query_schedule). Bump lastUsedAt on use.
- Settings > AI gets a "Memory" section: list remembered facts, delete buttons, "Clear all" (house format).
- System-prompt rule: silently store durable preferences the user states ("I never work before 10am",
  "Fridays are for uni"); NEVER store sensitive data (health, credentials, finances).

PART 3 — PROACTIVITY (no background LLM calls without a user-visible trigger; BYOK = user pays):
- "Plan my day": a one-tap card in the chat panel on first open of the day (client checks lastBriefingAt)
  that runs a scripted turn (query_schedule + memories → short plan + suggested actions as one-tap buttons).
- Overload hint: if today's scheduled load exceeds available work hours, the sidebar AI pill shows a subtle
  dot; clicking opens chat pre-seeded with "Your <day> is overbooked — want me to reshuffle?".

PART 4 — HOSTED AI (make BYOK optional, not required):
- Add a server-side default provider via env NEEDT_AI_API_KEY + NEEDT_AI_MODEL (cheap model — GLM or
  DeepSeek; extend the existing provider abstraction in src/services/ai/providers.ts, endpoint config only).
  Resolution order per request: user BYOK key if set, else hosted key. Model swappable by env (//todo: route
  tool-turns to a stronger model if cheap-model tool-calling proves unreliable).
- Metering: Prisma model AiUsage (userId, yearMonth, actionCount). Every agent turn on the HOSTED key
  increments it; BYOK turns are NOT metered. Helper canUseHostedAi(userId) enforces a per-plan monthly cap
  (limits config in one place; //todo billing wiring).
- UI: usage indicator in the chat panel ("240/300 actions left this month"); on cap, show upsell +
  "or use your own API key" link. Reframe BYOK in Settings > AI as "Advanced: use your own key (unlimited)".

PART 5 — RESCHEDULE PREVIEW (top Motion complaint: AI reshuffles the day without asking):
- Add a dry-run mode to the auto_schedule invocation path (scheduleAllTasksForUser): compute the new
  placement WITHOUT persisting; present a diff ("these N tasks move: old slot → new slot") with Apply / Cancel.
  The scheduling engine itself stays UNTOUCHED — this is a staging wrapper. Applied reflows keep a one-step
  Undo (snapshot previous scheduledStart/End). Wire it into both the agent's auto_schedule tool and the
  "Reflow schedule" button.

SECURITY: all tools operate on the authenticated user only; log tool calls via logger+LOG_SOURCE;
dangerous tools always confirm; the agent never sends mail and never edits the scheduling engine.

ACCEPTANCE (all green): lint (0 warnings), type-check, test:unit, build, build:worker, docker build;
migrations (AgentMemory, AiUsage) apply on a clean DB. Unit tests for: system-prompt assembly (token
budget + memory ranking), hosted-vs-BYOK usage metering, and reschedule diff staging. One PR from a
feat/ai-agent branch into main; CHANGELOG.md updated.
```

---

## Ручное (после мержа AI-AGENT)
- Env в Coolify (web + worker): `NEEDT_AI_API_KEY`, `NEEDT_AI_MODEL` (напр. GLM/DeepSeek). BYOK-ключи юзеров — уже шифруются существующим механизмом.
- До релиза дешёвой модели — прогони eval на 10–15 типовых командах («перенеси всё с четверга», «раскидай эссе на 3 сессии»); если tool-calling слабый, подними только tool-ходы на модель посильнее (в промте это //todo).
- Деплой как обычно: docker build → push → Coolify redeploy web (агент живёт в web; воркер трогать не нужно, если тулзы синхронные).
