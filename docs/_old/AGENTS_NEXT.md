# AGENTS_NEXT.md — Mina: инфра вживую → прод-деплой → MCP-слой

> Это НОВЫЙ фронт работ, ПОСЛЕ Liquid Glass редизайна (`AGENTS_DESIGN.md`).
> Выполняй ВСЁ ниже автономно, по порядку, БЕЗ остановок между фазами.
> Коммить после каждой фазы (`feat(next-N): ...` / `chore(...)` / `fix(...)`).
> Каждый неочевидный выбор логируй в `DECISIONS.md`. При неоднозначности — бери лучший
> дефолт, помечай его, иди дальше. В конце — обязательный self-QA (Phase F), чини фейлы до зелёного.

---

## Phase 0 — Санити и предусловие

**Сначала проверь, что дизайн закрыт.** Если Part 3–6 из `AGENTS_DESIGN.md` ещё НЕ закоммичены
(нет `/style` роута, нет `QA_REPORT.md`, тег `v0.2.0` не стоит) — **сначала доведи их по
`AGENTS_DESIGN_RESUME.md`, только потом начинай этот файл.** Не работай параллельно по обоим.

Проверка одной командой:
```bash
git tag | grep -q v0.2.0 && ls QA_REPORT.md src/app/style/page.tsx 2>/dev/null \
  && echo "DESIGN DONE → продолжай AGENTS_NEXT" \
  || echo "DESIGN НЕ ДОВЕДЁН → сперва AGENTS_DESIGN_RESUME.md"
```

Правила на весь файл:
- НЕ трогай untracked-файлы человека (`AGENTS*.md`, `.agents/`, lockfiles человека) сверх того, что явно требуется здесь.
- Пакетный менеджер проекта — **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). Не смешивай с npm.
- Секреты не коммить. Всё чувствительное — только в `.env.local` (в `.gitignore`) и в Vercel env.
- Даты в `DECISIONS.md` — абсолютные.

---

## Phase A — Поднять инфру вживую и закрыть блокер `/setup`

Цель: рабочее локальное окружение, где `/setup` реально заводит аккаунт, и neon-деп установлен.

1. **Обнови lockfile под Neon-деп.** `package.json` уже объявляет `@prisma/adapter-neon` и
   `@neondatabase/serverless`, но `pnpm-lock.yaml` их НЕ содержит (объявлены в оффлайн-сессии).
   Выполни `pnpm install` — лок обновится, пакеты встанут. Коммить обновлённый `pnpm-lock.yaml`.

2. **Локальный Postgres.** В репо есть `docker-compose.yml` и `npm run db:up`. Подними БД:
   `docker compose up -d` (или `pnpm db:up`). Проверь коннект по `DATABASE_URL` из `.env.local`.

3. **Миграции + клиент.** `pnpm prisma migrate deploy` (или `migrate dev` если нужны новые миграции
   под `ScheduledBlock`), затем `pnpm prisma generate`. Убедись, что `ScheduledBlock` реально в БД.

4. **`/setup` вживую.** Подними `pnpm dev` (порт 3001, НЕ по LAN-IP — PWA требует localhost/HTTPS).
   Пройди `/setup` до конца: аккаунт создаётся, редиректит внутрь, баннера ошибки нет. Если падает —
   почини по-настоящему (сейчас это главный блокер), не обходи.

5. **Смоук чанков вживую.** Создай задачу ~90 мин с макс-чанком 30 мин, запусти авто-планинг,
   убедись что на календаре реально ≥2 блока `ScheduledBlock` (не только первый слот).

**Acceptance A:** `pnpm install` прошёл и lockfile содержит neon; Postgres поднят; миграции применены;
`/setup` заводит аккаунт вживую; чанкованная задача показывает несколько блоков.
Коммит: `chore(next-a): live db + refreshed lockfile`.

---

## Phase B — Прод-деплой на Vercel + Neon

Phase 12 была только заготовкой (`docs/deploy.md`, cron-роуты, `/api/health`). Здесь — реальный деплой.

1. **Neon.** Заведи проект Neon (free tier). Получи **pooled** URL (для `DATABASE_URL`) и **direct**
   URL (для `directUrl` в Prisma / миграций). Прогони `prisma migrate deploy` на Neon.

2. **Neon-адаптер.** Провод Prisma-клиента: когда `DATABASE_URL` — это Neon pooled URL, использовать
   `@prisma/adapter-neon` + `@neondatabase/serverless`; для локального Postgres — стандартный клиент.
   Проверь `pnpm build` зелёный с адаптером.

3. **Vercel.** Заведи проект, залей env (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
   `NEXT_PUBLIC_*`, OAuth-ключи Google/Azure, Resend). Настрой **Vercel Cron** (free = 2 задачи):
   авто-планировщик + любой второй нужный джоб. Проверь `/api/health` отдаёт 200.

4. **Домен.** Подключи `minacalendar.com` к Vercel-проекту (домен свободен по контексту — если ещё не
   куплен, оставь `*.vercel.app` и пометь TODO в `DECISIONS.md`).

5. **Прод-смоук.** На задеплоенном URL: `/setup` → аккаунт → создать задачу → авто-планинг →
   focus-сессия. Ноль рантайм-ошибок в консоли.

**Acceptance B:** прод-URL живой, `/setup` работает на Neon, cron настроен, `/api/health` = 200,
build на Vercel зелёный. Коммит: `feat(next-b): vercel + neon production deploy`.

---

## Phase C — MCP-слой поверх `/api/connect/*`

Цель: управлять Mina из Claude / teenx-бота — встать в ряд с уже подключёнными FlowSavvy/Gmail/GCal/GDrive.
Коннектор-эндпоинты уже есть: `src/app/api/connect/{tasks,schedule,reschedule}/route.ts` с personal bearer token.

1. **MCP-сервер** (`mcp/` или отдельный воркспейс-пакет, stdio-транспорт). Оберни существующие
   эндпоинты как MCP-tools — НЕ дублируй бизнес-логику, только HTTP-вызовы к `/api/connect/*`:
   - `mina_create_task` → POST `/api/connect/tasks`
   - `mina_list_tasks` → GET `/api/connect/tasks`
   - `mina_schedule` → POST `/api/connect/schedule`
   - `mina_reschedule` → POST `/api/connect/reschedule`
   Base URL и bearer token — из env (`MINA_BASE_URL`, `MINA_CONNECT_TOKEN`).

2. **Сверься с реальным контрактом** эндпоинтов (`docs/connector-api.md`) — параметры и формы ответов
   бери из фактического кода роутов, не из предположений.

3. **README для MCP** — как подключить в Claude Desktop / Cowork (`claude_desktop_config.json` сниппет).

**Acceptance C:** MCP-сервер стартует, `mina_create_task` через токен реально создаёт задачу в Mina;
инструкция по подключению есть. Коммит: `feat(next-c): mcp server over connector api`.

---

## Phase D — На потом (НЕ делать в этой сессии, только зафиксировать TODO)

Добавь в `TODO.md` секцию «После v0.3.0», не реализуй:
- **Capacitor-обёртка** под App Store (Apple Developer $99/год) — PWA уже готова, натив позже.
- **Telegram / n8n** через `/api/connect/*` + personal token.
- Второй набор Vercel Cron, если понадобится больше 2 джобов (апгрейд плана).

---

## Phase F — ОБЯЗАТЕЛЬНЫЙ self-QA

Прогони, почини каждый фейл, перезапусти. Допиши результат в `QA_REPORT.md` (новая секция «AGENTS_NEXT»).

**Build/type/test**
- [ ] `pnpm install` чистый, `pnpm-lock.yaml` содержит neon-пакеты.
- [ ] `pnpm prisma validate` чисто; миграции применяются на свежей БД (локально И на Neon).
- [ ] `tsc --noEmit` чисто.
- [ ] Полный Jest зелёный (укажи pass/skip).
- [ ] `pnpm build` успешен (и локально, и на Vercel).

**Runtime**
- [ ] Локально: `/setup` заводит аккаунт; чанкованная задача = несколько блоков.
- [ ] Прод (Vercel+Neon): `/setup` работает; `/api/health` = 200; cron виден в Vercel.
- [ ] MCP: `mina_create_task` через токен создаёт задачу; она видна в UI.

**Housekeeping**
- [ ] `DECISIONS.md` обновлён (Neon URLs-подход, домен, MCP-выборы, любые компромиссы).
- [ ] `docs/deploy.md` отражает реальные шаги Neon+Vercel.
- [ ] `QA_REPORT.md` — каждый пункт pass/fail + заметка.
- [ ] Untracked-файлы человека (`AGENTS*.md`, `.agents/`) нетронуты.

**Только когда весь Phase F зелёный → тег `v0.3.0`.**

## Определение готовности
Phase A–C закоммичены; инфра живая (локально + Neon); прод-URL отвечает; MCP-сервер работает через
токен; `QA_REPORT.md` весь зелёный; `v0.3.0` проставлен; Phase D записана как TODO.
