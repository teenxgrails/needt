# Деплой Needt — Hetzner + Coolify (Вариант Б)

Один сервер держит всё: Next.js app + API, Postgres, Redis, BullMQ воркер и бот.
Coolify даёт деплой из git-push как на Vercel, авто-SSL, базы в один клик, авто-рестарт при падении.
Цель по цене: **~4.50–7.50 EUR/мес за всё.**

---

## 0. Что нужно заранее

- Аккаунт Hetzner Cloud (console.hetzner.cloud)
- Домен `needt.app` уже на Cloudflare ✅
- GitHub-репозиторий с кодом Needt/Mina (Coolify деплоит из него)
- Код бота тоже в репозитории (или Dockerfile)

---

## 1. Создать сервер

Hetzner Cloud → New Project «needt» → Add Server:

- Локация: **Nuremberg или Falkenstein** (DE) либо Helsinki (FI) — низкий пинг до Швейцарии
- Образ: **Ubuntu 24.04**
- Тип: **CX22** (2 vCPU / 4 GB / 40 GB) — ~4.50 EUR/мес. Бери **CX32** (8 GB), если билд Next падает по памяти (OOM).
- SSH-ключ: добавь свой
- Create. Запиши **публичный IPv4**.

> Совет: бэкапы (+20%) включи когда появятся платящие юзеры. Пока пропусти.

## 2. Установить Coolify

Зайди по SSH и запусти официальный установщик:

```bash
ssh root@<SERVER_IP>
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Подожди ~2–3 мин. Открой `http://<SERVER_IP>:8000`, создай аккаунт админа (первый юзер = владелец).

Направь домен на саму Coolify, чтобы её UI получил SSL (необязательно, но удобно):

- Cloudflare DNS: `A  coolify  <SERVER_IP>  (proxy OFF / серый облак)`
- В Coolify → Settings → укажи домен инстанса `coolify.needt.app`.

## 3. Подключить GitHub

Coolify → Sources → GitHub App → установи на свой репо(зитории). Это включает авто-деплой при push.

## 4. Базы данных (каждая в один клик)

Coolify → Project «needt» → New Resource:

- **PostgreSQL 16** → создать. Скопируй внутреннюю строку подключения → это `DATABASE_URL`.
- **Redis 7** → создать. Скопируй внутренний URL → `REDIS_URL` (нужен BullMQ).

Обе живут на том же сервере; используй **внутренние** хосты, которые даёт Coolify (не публичные) — трафик остаётся локальным и быстрым.

## 5. Задеплоить Next.js app

New Resource → Application → выбери репо/ветку (`main`).

- Build pack: **Dockerfile**, если в репо есть, иначе Nixpacks. (Репо уже на Docker — предпочти Dockerfile.)
- Install command: нужен `npm install --legacy-peer-deps` (React 19). Пропиши в build settings.
- Build: `npm run build`.
- Port: `3000`.
- Домены: укажи **`needt.app`** и **`now.needt.app`** (или твой поддомен приложения) → Coolify сам выдаст Let's Encrypt SSL. **Критично для .app** (HSTS preload = только HTTPS).
- Health check path: `/` или лёгкий роут `/api/health` → включает авто-рестарт в 3 ночи.

### Env-переменные (App)

```
NODE_ENV=production
DATABASE_URL=<из шага 4, postgres>
REDIS_URL=<из шага 4, redis>
NEXTAUTH_URL=https://needt.app
NEXTAUTH_SECRET=<openssl rand -base64 32>
# кука шарится между поддоменами:
NEXTAUTH_COOKIE_DOMAIN=.needt.app
# OAuth (Google/Outlook/CalDAV), Creem billing и т.д.
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CREEM_API_KEY=...
CREEM_WEBHOOK_SECRET=...
CREEM_PRODUCT_PRO_MONTHLY=...
CREEM_PRODUCT_PRO_YEARLY=...
CREEM_PRODUCT_LIFETIME=...
```

Прогонять Prisma-миграции на деплое: добавь post-deploy/release команду `npx prisma migrate deploy`.

## 6. Задеплоить BullMQ воркер (отдельный сервис, тот же репо)

New Resource → Application → тот же репо, но:

- Start command: `npm run build:worker && npm run start:worker` (или просто `start:worker`, если собран в образе)
- **Без домена, без публичного порта** — это фоновый процесс.
- Те же env-переменные, что у app (нужны `DATABASE_URL` + `REDIS_URL`).
- Health check: на уровне процесса; Coolify перезапустит, если упал.

## 7. Задеплоить бота (тот же сервер)

New Resource → Application → репо бота (или Dockerfile):

- Start command под твоего бота.
- Env: токен бота + `DATABASE_URL`/`REDIS_URL`, если делит их.
- Без публичного порта, если бот на long-polling. Если на webhook → дай ему `bot.needt.app` + SSL.
- Теперь бот живёт рядом с app — один сервер, один счёт.

## 8. Cloudflare DNS (финал)

```
A   @      <SERVER_IP>   proxy: ON (оранжевый)   # needt.app  -> app
A   now    <SERVER_IP>   proxy: ON               # поддомен приложения
A   bot    <SERVER_IP>   proxy: ON               # только если webhook-бот
A   coolify <SERVER_IP>  proxy: OFF              # UI Coolify (серый, чтобы LE сработал)
```

> Если Let's Encrypt падает с proxy ON, поставь запись серой (OFF) на время первой выдачи серта, потом верни оранжевый. Для `.app` режим SSL в Cloudflare должен быть **Full (strict)**.

## 9. Проверка

- `https://needt.app` открывается (http:// должен НЕ работать — для .app это норма)
- Логин работает, сессия сохраняется на `now.needt.app`
- Создал задачу → BullMQ-джоб отработал (смотри логи воркера в Coolify)
- Бот отвечает
- Подписанный тестовый Creem webhook доходит до `/api/billing/webhook`

## 10. Гигиена эксплуатации (настроить один раз)

- Авто-рестарт Coolify через health checks ✅ (закрывает «упало в 3 ночи»)
- Включи снапшоты/бэкапы Hetzner, когда будут реальные юзеры
- Coolify → Notifications → подключи Telegram/email для алертов о деплое и падениях
- Бэкапы Postgres: в Coolify есть плановые бэкапы БД → включи, цель — Hetzner Storage Box или S3

---

## Итог по цене

| Позиция                         | Цена              |
| ------------------------------- | ----------------- |
| Hetzner CX22 (4 GB)             | ~4.50 EUR/мес     |
| Coolify                         | 0 (self-hosted)   |
| Postgres / Redis / воркер / бот | 0 (тот же сервер) |
| **Итого**                       | **~4.50 EUR/мес** |

Апгрейд до CX32 (8 GB, ~7.50 EUR), когда серверу станет тесно — один клик, без миграции.

## Когда уходить с этой схемы

Только если перерастёшь один сервер (тысячи активных юзеров) — тогда вынеси БД на Hetzner Managed / Neon и масштабируй app горизонтально. До реального трафика — не проблема.
