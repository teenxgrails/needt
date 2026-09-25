# Needt — передача работы следующему агенту

См. также [`BOOTSTRAP.md`](BOOTSTRAP.md) — вставляй его первым сообщением в
любой новый чат/бот, это обязательно.

> **Текущий управляющий план — [`docs/plans/09-launch.md`](docs/plans/09-launch.md).**
> Начинай оттуда, с задачи L0.1. Планы 07/08 закрыты, кроме отложенных S11/T8 —
> их последовательность теперь задаёт план 09 (L0.3 и L7).
>
> **Параллельно — [`docs/plans/10-design.md`](docs/plans/10-design.md)**, дизайн-
> идентичность. Первая задача D0 (три живых варианта экрана Today в `/style`)
> запускается сразу и не блокирует запуск. Всё, что дальше D3, ждёт решения
> владельца по направлению. Раскатка по экранам (D5) — только после того, как
> прод запущен и стабилен. Дизайн-трек никогда не задерживает план 09.
>
> **Права автономии расширены 2026-08-22** (см. блок в `AGENTS.md`): мержить
> ветки, пушить и открывать PR, менять схему additive-миграциями, обновлять
> visual baselines после ручного просмотра diff — всё это без спроса. Деплой в
> прод, прод-секреты, внешние аккаунты, юридический текст и дизайн-направление —
> только через владельца.

## Текущее состояние — 2026-08-16 (codex закончил лимиты после release-boundary audit)

- Репозиторий: `/Users/lol/Needt`. Ветка/worktree: `codex/design-completion`.
- Последний коммит: `031e5e1`. Всё, что было "в процессе" по состоянию на
  предыдущую запись (E2E-фикс, T8.5, AI workspace scoping, T9/T10/S12) —
  **закончено и закоммичено**. Коммиты после `ff4d284`, по порядку:
  `c52be21` → `d9f3dbe` (E2E стабилизирован) → `2109bfc` (T8.5 Mail focused
  splits) → `66fb242` → `b147a11` (AI workspace scoping) → `48711c5` (T9
  coverage audit) → `9b7c641` → `9c8f26e` → `cb1f1dd` → `daa0888` → `031e5e1`.
- **`20260816-codex-final-gates.md` (status: complete)**: T9/T10/S12 все
  зелёные, включая E2E (24 passed, 3 credential-gated skip), полный visual
  matrix на prod-сервере (65 passed, 4 intentional skip), unit, type-check,
  lint, prod Docker build (`sha256:3dc3d7f2...`). **Нет P0/P1 находок.**
  Текущий релиз готов к деплою и смоуку.
- **Figma-капча Settings — завершена** (`20260816-codex-figma-settings-
  capture.md`, status: complete): все 16 вкладок Settings + все safe-попапы
  захвачены реальным `window.figma.captureForDesign`. Временный `?captureTab`
  параметр не понадобился — в коде его нет (проверено, чисто). Ничего больше
  делать по этому пункту не нужно.

## Что реально осталось (два независимых блокера)

### 1. T8.5 Mail focused splits — фича готова, тест — нет

Контракт выполнен (`userId`-only, без workspace/sharing), реализация
закоммичена в `2109bfc`, unit-тесты и E2E прошли. Но
`20260815-codex-mail-focused-splits.md` всё ещё `status: blocked`: точечный
visual-тест `secondary-surfaces` таймаутится на навигации `/mail` **в dev-
матрице** (известная нестабильность dev-сервера под этим sandbox mount, не
баг продукта — prod build компилирует `/mail` нормально). Next action:
разобраться с таймаутом на dev-матрице, перегнать `secondary-surfaces`,
посмотреть diff перед обновлением baseline, закрыть handoff.

### 2. Деплой + smoke test текущего релиза — единственное, что блокирует всё остальное

`20260816-codex-release-boundary-audit.md` (status: blocked, последняя
запись, 04:30): есть два **не влитых** и специально отложенных branch'а с
готовой работой:

- `codex/sol-s11-contracts` (коммит `a180003`) — S11 contract.
- `codex/terra-t8-product-ui` (коммиты `44d225f`…`e0a1dc2`) — T8.1–T8.4 UI.

По плану (`docs/plans/README.md`) их нельзя вливать раньше времени: **S11
требует, чтобы S6–S10 были задеплоены и стабильны; T8 UI требует S11**.
Read-only three-way merge уже нашёл конфликты в `CHANGELOG.md` и
`playwright.config.ts`, плюс `prisma/schema.prisma` независимо менялся на
обеих линиях (нужно вручную сохранить текущий AI workspace scope при
интеграции). У отложенной ветки также тонкое покрытие — нет Playwright для
Saved Views / reschedule-preview / health-journal.

**Это решение не для агента** — нужен реальный деплой + smoke test текущего
`codex/design-completion` (Docker недоступен внутри codex-sandbox в этой
сессии). Как только владелец задеплоил и подтвердил, что всё ок:

1. Создать изолированный worktree/branch для интеграции S11/T8.
2. Вручную развести конфликты (`CHANGELOG.md`, `playwright.config.ts`,
   `prisma/schema.prisma` — сохранить текущий `AiConversation`/`AiMessage`/
   `AgentMemory` workspace-scope).
3. Добавить E2E на каждый новый user journey S11/T8.
4. Прогнать T10 → S12 гейты на интеграционном SHA.

## Некоммиченное прямо сейчас (проверено, что можно/нельзя трогать)

- `.codex/config.toml`, `src/app/layout.tsx` — осознанное решение владельца
  (Figma capture + network access), **не трогать**.
- `docs/plans/README.md` — актуальная фазовая таблица (S1→...→S12),
  подтверждена аудитом, безопасно закоммитить.
- `CLAUDE.md` — мелкая правка описания Prisma-схемы, безопасно закоммитить.
- `AGENTS.md` — был оборванный незакрытый заголовок "## Imported Claude
  Cowork project instructions" без содержимого (похоже на прерванный
  импорт CLAUDE.md → AGENTS.md); claude-cowork убрал его 2026-08-16.
- `.claude/settings.local.json`, `.playwright-mcp/`,
  `pages-mobile-slash-390.png` — мусор от Playwright MCP/визуальных
  прогонов, не деливерабл, можно игнорировать/добавить в `.gitignore`.

## Обязательно перед работой

```bash
npm run agent:context
git status --short
```

Активных (`status: active`) handoff'ов сейчас нет — только `complete` и
`blocked` (см. выше). Прочитать оба `blocked`-handoff'а перед стартом:
`.agents/handoffs/20260815-codex-mail-focused-splits.md` и
`.agents/handoffs/20260816-codex-release-boundary-audit.md`.

## Owner-решения, зафиксированные ранее (не переспрашивать)

1. **T8.5 Focused Mail splits**: только личные, скоуп на `userId`. Реализовано.
2. **Figma-тулинг и `.codex/config.toml` network/workspace-write** — оставить,
   осознанно.
3. **Не сливать `sol-s11-contracts` / `terra-t8-product-ui` раньше деплоя**
   текущего релиза — жёсткое требование плана, не обходить.

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
