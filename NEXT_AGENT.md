# Needt — передача работы следующему агенту

См. также [`BOOTSTRAP.md`](BOOTSTRAP.md) — вставляй его первым сообщением в
любой новый чат/бот, это обязательно.

## Текущее состояние — 2026-08-15 (codex закончил лимиты в процессе E2E-фикса)

- Репозиторий: `/Users/lol/Needt`. Ветка/worktree: `codex/design-completion`.
- Последний коммит: `049a92c` (docs cleanup + BOOTSTRAP.md, сделан claude-cowork).
- Несохранённые изменения codex, ещё не закоммичены — **все проверены и
  разрешены владельцем, не откатывать**:
  - `playwright.config.ts` — `workers: 1` вместо `undefined`. Это фикс
    флакового E2E: 4 параллельных воркера дрались за один общий
    Postgres/Redis fixture при холодной компиляции. С `--workers=1` вручную
    уже прогонялось: 24 passed, 3 credential-gated skips. **Не подтверждён
    финальный прогон с этим конфигом без ручного override** — лимиты
    кончились прямо перед этим шагом.
  - `.codex/config.toml` (`sandbox_mode=workspace-write`, `network_access=true`)
    и `src/app/layout.tsx` (Figma html-to-design capture script) —
    **осознанное решение владельца**: он попросил не делать полноценный UI
    сейчас, дизайн будет переделываться в Figma (вместе с claude-cowork,
    отдельная сессия). Не реверти это.
  - `docs/plans/README.md` — переписан в фазовую таблицу зависимостей
    (S1→S2, S6→T5, S7→T6→S8, S9/S10 с T7, S11→T8, T9→T10→S12). Валидно, не
    трогать без причины.
  - `CLAUDE.md` — мелкая правка описания Prisma-схемы под реальность
    (workspaces/Pages/collaboration/AI), безопасно.
- Ранее (delivery audit, `20260815-codex-delivery-audit.md`): полный набор
  non-Docker гейтов зелёный в изолированной копии — type-check, lint, 681
  unit-тест, branding, UI-контракты, worker/collaboration build, prod build.
  T8.1–T8.4 и S11–S12 подтверждены закрытыми.

## Owner-решения, зафиксированные 2026-08-15 (не переспрашивать)

1. **T8.5 Focused Mail splits**: только личные, скоуп на `userId`. Никакой
   видимости другим участникам workspace, никакой shared-модели — проще, чем
   Pages permissions. Реализовывать напрямую этим контрактом, отдельный Sol
   contract для ролей/грантов не нужен именно для этой фичи.
2. **Figma-тулинг и `.codex/config.toml` network/workspace-write** — оставить,
   осознанно. Полноценный UI-полиш сейчас не нужен, дизайн переезжает в
   Figma.

## Обязательно перед работой

```bash
npm run agent:context
git status --short
```

Прочитать `AGENTS.md`, `docs/AI-COLLABORATION.md`, оба handoff'а от
2026-08-15 (`20260815-codex-delivery-audit.md`,
`20260815-codex-e2e-reproducibility.md`) и нужный раздел
`docs/plans/07-sol-high.md` / `docs/plans/08-terra-high.md`.

Не выполнять `git add .`, `git stash`, `git clean`, `git reset` или
`git checkout --`. Если `git` ругается на `index.lock`, который не создавал
текущий процесс — это может быть FS-артефакт этого монтирования, а не живой
писатель; см. `20260815-claude-docs-cleanup` контекст, не форсить вслепую.

## Что делать в первую очередь (точный порядок)

1. Прогнать `npm run test:e2e` без CLI-оverride (конфиг уже поправлен).
   Если результат совпадает с ранее подтверждённым (24 passed, 3 skip) —
   закоммитить только `playwright.config.ts` отдельным коммитом, закрыть
   `20260815-codex-e2e-reproducibility.md` (`status: complete`).
2. Реализовать T8.5 Mail focused splits контрактом "только личные,
   `userId`-scope" (см. owner-решение выше). Обновить статус T8.5 в
   `docs/plans/08-terra-high.md`.
3. Продолжить по `docs/plans/README.md`: S9/S10 с T7, затем финальный гейт
   T9→T10→S12.
4. **AI safety до обучения пользователей (не начато)**:
   - Workspace scope в `AiConversation`, `AiMessage`, `AgentMemory` через
     additive expand/backfill/contract migration.
   - Завершить S10: server-side membership, confirmations, idempotency,
     entity links, quota/provider/partial-failure recovery.
   - UI, BYOK, BullMQ и deterministic scheduler сохранить; Vercel AI SDK
     только как feature-flagged adapter, DeepSeek V4 Pro primary, GPT-5.6
     Terra fallback, Promptfoo evals, Sentry metadata-only monitoring.
   - Будущий corpus: opt-out, encrypted raw retention 90 дней, только
     personal workspace; exclude shared workspaces, mail, attachments,
     provider payloads. Dataset export/training выключены до owner legal
     review.

## Текущие блокеры

- E2E-фикс не подтверждён финальным прогоном (см. п.1 выше).
- Docker Desktop статус на момент записи не проверен из этой сессии
  (claude-cowork sandbox не имеет Docker вообще) — `20260815-codex-e2e-
  reproducibility` сообщал, что на хосте Docker уже восстановлен; перепроверь
  `docker info` перед тем как считать это блокером.
- Реальное обучение/экспорт пользовательских данных требует owner legal
  review — не начинать без явного запроса.

## Рабочие правила (без изменений)

- Один workstream — отдельные branch/worktree/handoff; перед записью сверять
  ownership файлов.
- Все user-owned сущности — workspace scope (кроме Mail, см. owner-решение
  выше), доступ проверяется серверно по membership.
- Миграции только additive; не удалять пользовательские данные.
- До изменения библиотек/Docker/Prisma/Next.js/AI providers — Context7. Для
  UI — Playwright до/после и visual/style suites.
- После scope: точечные проверки, `type-check`, lint, relevant tests/build,
  explicit stage, scoped commit, обновить handoff.
