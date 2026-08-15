# Needt — Задача Б (async очередь + webhooks + realtime), ФИНАЛЬНЫЙ промт для Codex — 2026-07-17

Задача В (упрощение сборки) смержена. Это финальная, сверенная с текущим кодом версия
промта Задачи Б. Скопируй блок «ПРОМТ ДЛЯ CODEX» целиком в новую сессию Codex. Ниже блока —
ручной чеклист (то, что Codex сделать не может) и заметки, что изменилось против чернового промта.

---

## Что сверено с кодом (чтобы Codex не тыкался вслепую)

- `bullmq ^5.41.9` и `ioredis ^5.6.0` **уже в package.json** — кода нет. Не переустанавливать, просто использовать.
- `output: "standalone"` в `next.config.js` → web стартует `node server.js` (это `.next/standalone/server.js`).
  Dockerfile (root, мультистейдж base→builder→production): `npm ci --include=dev --legacy-peer-deps --ignore-scripts`,
  `prisma generate` до `next build`, production-стейдж копирует `.next/standalone`, `CMD ["node","server.js"]`.
- Провайдерные sync-энтрипоинты **разные**:
  - CalDAV: `new CalDAVCalendarService(feed.account).syncCalendar(feedId, feed.url, feed.userId)` из `@/lib/caldav-calendar`.
  - Outlook: `syncOutlookCalendar(...)` из `@/lib/outlook-sync` (+ роут `src/app/api/calendar/outlook/sync/route.ts`).
  - Google: **reusable-функции синка НЕТ** и роута `google/sync` НЕТ — логика размазана по `src/app/api/calendar/google/*`.
  - Планировщик: `scheduleAllTasksForUser(userId, ...)` из `@/services/scheduling/TaskSchedulingService`.
- Крон уже есть: `/api/cron/reschedule` и `/api/cron/sync-calendars`. `sync-calendars` синкает **только CALDAV**;
  Google/Outlook помечены как «route-driven». Оставить как safety-net.
- `src/services/connectors/webhooks.ts` — это **ИСХОДЯЩИЙ** connector-вебхук (POST на юзерский URL, события
  `schedule.changed` / `task.completed`). НЕ путать с новыми **входящими** Google/Graph вебхуками.
- `CalendarFeed` содержит `enabled`, `account` (relation), `url`, `userId`, `type`, `lastSync`, `error`.

---

## ПРОМТ ДЛЯ CODEX

```
Контекст: Next.js 15 (App Router, output "standalone"), React 19, TS, Prisma+Postgres (Neon),
NextAuth v4, Zustand, TanStack Query, FullCalendar. Форк FluidCalendar, уже сведён к ОДНОЙ
унифицированной сборке (двойная saas/open машинерия удалена). Прод: Dockerfile (root) → Coolify
на Hetzner, домен needt.app. `bullmq ^5.41.9` и `ioredis ^5.6.0` УЖЕ в package.json — кода нет.

Цель: почти мгновенная синхронизация календарей + async-фундамент под будущие коннекторы и
парсинг почты. Архитектура: внешнее событие (webhook провайдера) → задача в очереди (BullMQ/Redis)
→ отдельный воркер-процесс синкает конкретный фид → realtime-пуш в UI (SSE) → клиент инвалидирует
TanStack Query и обновляется за секунды. Крон-эндпоинты остаются как fallback/полная периодическая
синхронизация — НЕ удалять.

Соблюдай конвенции CLAUDE.md СТРОГО: singleton `prisma` из @/lib/prisma; даты только через
@/lib/date-utils (включая new Date()); `logger` из @/lib/logger с per-file LOG_SOURCE; в
route-хендлерах `params` это Promise (await params); доступ к календарным данным через
@/lib/calendar-db. Изменения инкрементальные и по делу, не рефактори несвязанное. Секреты только
из env. Обнови CHANGELOG.md под [unreleased].

Реализуй:

1. ОЧЕРЕДЬ (BullMQ + Redis, deps уже есть):
   - src/lib/queue/connection.ts: один ioredis-коннект из process.env.REDIS_URL
     (maxRetriesPerRequest: null для BullMQ). Экспортируй переиспользуемый connection.
   - src/lib/queue/queues.ts: фабрики очередей "calendar-sync", "reschedule", "webhook-renew".
   - src/lib/queue/enqueue.ts: тонкие типизированные хелперы (enqueueCalendarSync(feedId),
     enqueueReschedule(userId), enqueueWebhookRenew(...)), чтобы веб-часть клала задачи, НЕ
     импортируя воркер. Job-данные типизируй (Zod или TS-типы), дедуп по jobId где уместно
     (напр. jobId = `calendar-sync:${feedId}` чтобы не копить дубли на один фид).

2. ВОРКЕР КАК ОТДЕЛЬНЫЙ ПРОЦЕСС:
   - src/worker/index.ts — поднимает BullMQ Worker на каждую очередь, шарит тот же ioredis
     connection, обрабатывает graceful shutdown (SIGTERM/SIGINT → worker.close()).
     Обработчики вызывают СУЩЕСТВУЮЩИЕ сервисы:
       * calendar-sync: по feed.type → CalDAV: `new CalDAVCalendarService(feed.account)
         .syncCalendar(feed.id, feed.url, feed.userId)` из @/lib/caldav-calendar;
         Outlook: `syncOutlookCalendar(...)` из @/lib/outlook-sync;
         Google: см. пункт 2a.
       * reschedule: `scheduleAllTasksForUser(userId)` из @/services/scheduling/TaskSchedulingService.
       * webhook-renew: перерегистрация watch-каналов/подписок (пункты 3–4).
     После успешной работы обработчик публикует realtime-событие (пункт 6).
   - Скрипты package.json: `build:worker` и `start:worker`. Т.к. production-образ копирует только
     `.next/standalone` (обрезанный Next-трейсингом node_modules), tsc-вывода воркеру НЕ хватит в
     рантайме. Поэтому собирай воркер БАНДЛОМ через esbuild с инлайном зависимостей:
       build:worker = "esbuild src/worker/index.ts --bundle --platform=node --target=node22
         --format=cjs --outfile=dist/worker/index.js --external:@prisma/client --external:.prisma"
     (Prisma client оставь external и скопируй .prisma/node_modules отдельно — см. Dockerfile.)
     start:worker = "node dist/worker/index.js". Добавь esbuild в devDependencies если его нет.
   - tsconfig: убедись что src/worker компилируется в type-check (`tsc --noEmit` должен видеть его).
   - Dockerfile (root): в builder-стейдже добавь `RUN npm run build:worker`; в production-стейдж
     скопируй `dist/worker` из builder И убедись, что Prisma client доступен воркеру
     (.prisma уже копируется). Тот же образ: web = `node server.js` (как сейчас),
     worker = переопределение команды на `node dist/worker/index.js`. Задокументируй оба режима
     комментарием в Dockerfile.

2a. GOOGLE FEED-SYNC (ВАЖНО — сейчас нет reusable-функции):
   - У Google, в отличие от Outlook, нет функции синка целого фида и нет роута google/sync —
     логика синка размазана по src/app/api/calendar/google/*. Вынеси её в reusable серверную
     функцию `syncGoogleCalendar(feed)` в @/lib/google-sync.ts по образцу @/lib/outlook-sync.ts
     (та же сигнатура/паттерн: тянет события через существующий google-клиент, пишет в БД через
     calendar-db, обновляет lastSync/error). Затем перенаправь СУЩЕСТВУЮЩИЙ вызов синка в
     google-роуте на эту функцию (без изменения поведения) и вызывай её же из воркера. НЕ дублируй
     логику. Если извлечение оказывается объёмным — сделай минимально достаточную обёртку, но общий
     код должен быть один.

3. GOOGLE PUSH (Calendar events.watch):
   - При подключении/включении Google-фида регистрируй watch-канал (events.watch) с адресом
     https://<WEBHOOK_BASE_URL>/api/webhooks/google. Сохраняй channelId, resourceId, expiration,
     channelToken в новой Prisma-модели (пункт 7).
   - Route src/app/api/webhooks/google/route.ts (POST): валидируй заголовки X-Goog-Channel-ID /
     X-Goog-Resource-ID / X-Goog-Channel-Token, найди фид, `enqueueCalendarSync(feedId)` только для
     этого фида. Быстрый 200 (работа — в воркере).
   - Каналы Google живут ~7 дней → repeatable job webhook-renew перерегистрирует до истечения.

4. MICROSOFT GRAPH SUBSCRIPTIONS (Outlook calendar):
   - При подключении/включении POST /subscriptions с notificationUrl
     https://<WEBHOOK_BASE_URL>/api/webhooks/outlook, ресурс — события календаря,
     expirationDateTime, clientState. Сохраняй subscriptionId + expiry в модели (пункт 7).
   - Route src/app/api/webhooks/outlook/route.ts: СНАЧАЛА обработай validationToken-handshake
     (верни токен как text/plain, статус 200, в пределах 10с). Затем change-notifications →
     проверь clientState → `enqueueCalendarSync(feedId)`.
   - Subscriptions живут ~3 дня → renew в webhook-renew.

   ВАЖНО: не путай с СУЩЕСТВУЮЩИМ src/services/connectors/webhooks.ts — это ИСХОДЯЩИЙ connector-
   вебхук на юзерский URL (schedule.changed/task.completed). Новые ВХОДЯЩИЕ провайдер-вебхуки —
   отдельный код: роуты в src/app/api/webhooks/*, вспомогательная логика в
   src/lib/calendar-webhooks/ (регистрация/renew/валидация каналов и подписок).

5. ИНКРЕМЕНТАЛЬНЫЙ СИНК: webhook кладёт задачу на КОНКРЕТНЫЙ фид. Если провайдерный сервис
   поддерживает syncToken (Google) / deltaLink (Graph) — используй инкрементальную синхронизацию,
   иначе полный синк фида. Не ломай существующий ручной синк и крон.

6. REALTIME-ПУШ В UI:
   - SSE-эндпоинт src/app/api/stream/route.ts (per-user, авторизация по сессии NextAuth;
     runtime nodejs, не edge — нужен ioredis). Держит соединение, шлёт heartbeat.
   - Воркер после успешного синка публикует в Redis pub/sub канал по userId событие
     "calendar-updated" / "tasks-updated"; /api/stream подписан на Redis и ретранслирует браузеру.
   - Клиентский хук (src/hooks или src/store) подключается к SSE через EventSource, при событии
     инвалидирует соответствующие TanStack Query ключи (события календаря / задачи). Авто-reconnect
     при обрыве. UI обновляется за секунды без ручного refetch.

7. PRISMA: добавь модель CalendarWebhook (id, provider, feedId FK→CalendarFeed, channelId/
   subscriptionId, resourceId?, expiration DateTime, clientState/channelToken, createdAt, updatedAt;
   уникальность по (provider, feedId)). Сгенерируй миграцию (`prisma migrate dev --name ...`),
   миграция должна применяться на чистой БД. Singleton prisma, date-utils, logger+LOG_SOURCE.

8. ENV: добавь REDIS_URL, WEBHOOK_BASE_URL (дефолт = NEXTAUTH_URL). Обнови И .env.example, И
   ENV_TEMPLATE.md.

9. ДОКУМЕНТАЦИЯ: docs/realtime-sync.md — какие env нужны, как поднять Redis и worker-сервис в
   Coolify (тот же образ, override команды на `node dist/worker/index.js`), как настроить Google
   domain verification и Azure Graph permissions (кратко, со ссылками на редиректы
   /api/calendar/google, /api/calendar/outlook и вебхуки /api/webhooks/*).

Ограничения:
- Крон-эндпоинты (/api/cron/*) НЕ удалять — safety-net.
- Вебхук-эндпоинты публичные: защити проверкой channelToken/clientState, логируй через logger+LOG_SOURCE.
- Ничего не хардкодить, секреты из env.

Критерии приёмки (прогони и добейся зелёного):
- `npm run lint` — 0 warnings; `npm run type-check` — чисто; `npm run build` — успешно;
  `npm run build:worker` — собирает dist/worker/index.js; `docker build -t needt-test .` — успешно.
- Миграция Prisma есть и применяется на чистой БД.
- docs/realtime-sync.md описывает полный сетап (Redis, worker-сервис, env, Google/Azure).
- Юнит-тесты там, где практично: валидатор входящих вебхуков (заголовки/clientState),
  enqueue-хелперы, сборка pub/sub-ключей по userId.
- Один связный PR; в описании кратко перечисли новые файлы, модель и env.
```

---

## ЧАСТЬ 3 — Ручной чеклист (Codex это не может), делать ПОСЛЕ мержа Б

### Инфраструктура в Coolify

1. **Redis:** Coolify → New Resource → Database → Redis. Скопируй внутренний URL
   (`redis://default:<pass>@<service>:6379`).
2. **Воркер как отдельный сервис:** Coolify → New Resource → Application → тот же Git-репо, тот же
   Dockerfile, **override команды запуска** на `node dist/worker/index.js`. Домен воркеру не нужен.
3. **Env одинаковый на ОБОИХ сервисах (web + worker):**
   ```
   DATABASE_URL=...        DIRECT_URL=...
   REDIS_URL=redis://default:<pass>@<service>:6379
   NEXTAUTH_URL=https://needt.app
   NEXTAUTH_SECRET=...     CRON_SECRET=...
   WEBHOOK_BASE_URL=https://needt.app
   GOOGLE_CLIENT_ID=...    GOOGLE_CLIENT_SECRET=...
   AZURE_AD_CLIENT_ID=...  AZURE_AD_CLIENT_SECRET=...  AZURE_AD_TENANT_ID=common
   ```
4. **Миграция БД:** после деплоя `npx prisma migrate deploy` (Coolify Terminal контейнера web или
   pre-deploy команда).

### Google Cloud Console

5. Enable Google Calendar API (+ Tasks API если нужно).
6. OAuth consent screen: скоупы (`calendar`, `calendar.events`, `userinfo.email`, `tasks`) +
   добавь себя в Test users (или publish).
7. Credentials → OAuth client → Authorized redirect URI: `https://needt.app/api/calendar/google`.
8. **Domain verification (обязательно для push!):** подтверди needt.app в Google Search Console И
   добавь в APIs & Services → Domain verification. Без этого watch-каналы не регистрируются.

### Azure Portal (Outlook)

9. API permissions: Microsoft Graph → `Calendars.ReadWrite` (delegated), `offline_access`,
   `User.Read`. Admin consent если требуется.
10. Certificates & secrets → client secret. Authentication → Redirect URI (Web):
    `https://needt.app/api/calendar/outlook`.
11. Для Graph subscriptions notificationUrl должен быть публичным HTTPS (needt.app уже такой),
    доп. верификация не нужна, но эндпоинт обязан ответить на validation-handshake за 10с (это код).

### Cloudflare

12. Пока grey cloud — ок. Если включишь proxy — добавь allow-правило WAF на POST `/api/webhooks/*`.

### Проверка realtime

13. Переподключи Google/Outlook в приложении (регистрирует watch/subscription).
14. Измени событие прямо в Google/Outlook → в Needt появляется за секунды.
15. Логи worker-сервиса в Coolify: при изменениях идут задачи calendar-sync.

---

## Что изменилось против чернового промта из needt-async-plan.md

1. **Deps не переустанавливаем** — bullmq/ioredis уже в package.json (было «deps есть», уточнено с версиями).
2. **Явный анти-конфликт** с существующим `src/services/connectors/webhooks.ts` (исходящий connector-вебхук)
   — новые входящие провайдер-вебхуки вынесены в отдельные пути.
3. **Google feed-sync (пункт 2a)** — добавлен, т.к. reusable-функции синка и роута google/sync
   в коде НЕТ (у Outlook есть `syncOutlookCalendar`). Без этого воркер не сможет синкать Google.
4. **Сборка воркера через esbuild-бандл**, а не голый tsc — потому что production-образ копирует
   только обрезанный `.next/standalone` node_modules, и tsc-выводу воркера не хватит рантайм-зависимостей.
5. Уточнены реальные имена/пути: `scheduleAllTasksForUser`, `CalDAVCalendarService.syncCalendar`,
   `syncOutlookCalendar`, `output: "standalone"` → `node server.js`, оба env-шаблона (.env.example + ENV_TEMPLATE.md).
