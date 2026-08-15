# Needt — Задача Б, ЧАСТЬ 3: ручной деплой (runbook) — 2026-07-17

Пошагово. Код Б смержен/готов. Всё это Codex сделать не может — только ты, в дашбордах.
Порядок строгий: локальная проверка → push → web redeploy → Redis → worker-сервис → env → миграция →
Google/Azure → проверка realtime. Не пропускай шаг 0 — на нём падал прошлый деплой.

---

## 0. Локальная проверка ПЕРЕД пушем (главный гейт)

```bash
# docker build — прошлый баг деплоя был именно тут (NODE_ENV/devDeps → Module not found)
docker build -t needt-test .

# воркер собрался и стартует из бандла
node dist/worker/index.js        # поднимется и будет ждать Redis, либо ругнётся на REDIS_URL — это ок

# миграция применяется на чистой БД
docker compose up db -d
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres" npx prisma migrate deploy
```

Всё зелёное → идём дальше. `docker build` упал → чинить до пуша, в прод не тащить.

## 0.1 Проверка ветки перед пушем

```bash
git log --oneline origin/main..HEAD     # что реально уедет (Codex предупредил: там неск. коммитов)
git diff --stat origin/main..HEAD
```

Всё своё и ожидаемое → `git push`. Намешано чужое → разобрать до пуша.

---

## 1. Redeploy web в Coolify

- Push в `main` → Coolify web-приложение → Redeploy.
- Дождись зелёного билда, проверь что needt.app открывается и логин/БД работают как раньше.

## 2. Redis-ресурс в Coolify

- Coolify → New Resource → Database → **Redis**.
- Скопируй внутренний connection URL: `redis://default:<pass>@<service-name>:6379`.

## 3. Worker как отдельный сервис

- Coolify → New Resource → Application → **тот же Git-репо**, **тот же Dockerfile** (root), тот же branch.
- **Override команды запуска:** `node dist/worker/index.js` (в Dockerfile закомментирован пример, стр. 50–52).
- Домен воркеру **не нужен** — он не слушает HTTP.
- Порт/healthcheck не выставляй (или отключи), иначе Coolify будет считать сервис нездоровым.

## 4. Env — ОДИНАКОВЫЙ набор на web И worker

```
DATABASE_URL=...            DIRECT_URL=...
REDIS_URL=redis://default:<pass>@<service-name>:6379
NEXTAUTH_URL=https://needt.app
NEXTAUTH_SECRET=...
CRON_SECRET=...                       # openssl rand -hex 32
WEBHOOK_BASE_URL=https://needt.app
GOOGLE_CLIENT_ID=...        GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...      AZURE_AD_CLIENT_SECRET=...      AZURE_AD_TENANT_ID=common
```

Оба сервиса должны видеть одинаковые `DATABASE_URL` и `REDIS_URL` — иначе воркер не подхватит задачи.
После правки env — Restart обоих сервисов.

## 5. Миграция БД

После деплоя один раз примени миграцию (Coolify Terminal контейнера **web**):

```bash
npx prisma migrate deploy
```

Проверь, что таблица `CalendarWebhook` создалась (`npx prisma studio` локально на прод-БД, либо psql).

---

## 6. Прод-гигиена: кроны (из deploy-заметок, ещё не сделано)

Кроны — safety-net (вебхуки Б дают мгновенный синк, кроны добивают периодикой; `sync-calendars` по крону
синкает только CalDAV).

- `CRON_SECRET` и `NEXTAUTH_URL` уже в env (шаг 4). Заведи **2 Scheduled Tasks** в Coolify (node в контейнере есть):

```bash
# reschedule — расписание 30 5 * * *
node -e "fetch('http://localhost:3000/api/cron/reschedule',{headers:{'x-cron-secret':process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"

# sync-calendars — расписание 0 5 * * *
node -e "fetch('http://localhost:3000/api/cron/sync-calendars',{headers:{'x-cron-secret':process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"
```

Проверка: `curl -H "x-cron-secret: СЕКРЕТ" https://needt.app/api/cron/reschedule` → `{"ok":true}`.

---

## 7. Google Cloud Console (обязательно для push-вебхуков)

1. Enable **Google Calendar API** (+ Tasks API если используешь).
2. OAuth consent screen: скоупы `calendar`, `calendar.events`, `userinfo.email`, `tasks`;
   добавь себя в **Test users** (или publish).
3. Credentials → OAuth client → Authorized redirect URI: **сверь с реальным callback в коде**
   (в NextAuth-конфиге; в заметках было `https://needt.app/api/calendar/google`).
4. **Domain verification — без неё watch-каналы НЕ регистрируются:**
   подтверди `needt.app` в Google Search Console И добавь в
   APIs & Services → **Domain verification** в Cloud Console.

## 8. Azure Portal (Outlook / Graph)

1. App registration → API permissions → Microsoft Graph (delegated): `Calendars.ReadWrite`,
   `offline_access`, `User.Read`. Admin consent если требуется.
2. Certificates & secrets → создай **client secret** → в `AZURE_AD_CLIENT_SECRET`.
3. Authentication → Redirect URI (Web): сверь с кодом (в заметках `https://needt.app/api/calendar/outlook`).
4. Graph subscriptions: notificationUrl должен быть публичным HTTPS (needt.app — да). Доп. верификация
   не нужна, но эндпоинт обязан ответить на validation-handshake за 10с — это уже в коде Б.

## 9. Cloudflare

- Пока grey cloud (DNS only) — ничего не надо.
- Включишь оранжевое облако (proxy) → добавь allow-правило WAF на POST `/api/webhooks/*`,
  иначе провайдерские вебхуки будут резаться.

---

## 10. Проверка, что realtime реально работает

1. В приложении **переподключи** Google/Outlook календари — это регистрирует watch-канал / subscription
   (запись появится в таблице `CalendarWebhook`).
2. Измени событие **прямо в Google/Outlook** календаре (не в Needt).
3. В Needt событие должно появиться/обновиться за секунды (SSE → инвалидация кэша).
4. Логи **worker**-сервиса в Coolify: при изменении должны идти задачи `calendar-sync`.
5. Если тихо: проверь (а) `REDIS_URL` одинаков на web+worker, (б) worker-сервис Running,
   (в) `WEBHOOK_BASE_URL=https://needt.app`, (г) domain verification в Google пройдена,
   (д) вебхук-эндпоинт отвечает 200 (Coolify web-логи).

---

### Готово, когда

- web + worker оба Running в Coolify; таблица `CalendarWebhook` есть; правка события в Google/Outlook
  прилетает в Needt за секунды; в логах воркера видны calendar-sync задачи.
