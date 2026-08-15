# Needt — прогресс и план (обновлено 2026-07-18)

Единый чек-лист. Два трека параллельно: **A — техническое (твоими руками)** сейчас в фокусе,
**B — фоновый код (Codex)** пишется рядом, ловим ошибки. Легенда: [x] готово · [~] в процессе · [ ] надо.

---

## ✅ Сделано (бэкенд-костяк)
- [x] Задача В — упрощение сборки (один продукт)
- [x] FIX — баги аудита + ребрендинг Needt + выпил старой стартовой
- [x] Motion-настройки (Settings)
- [x] Задача Б — realtime: BullMQ+Redis worker, вебхуки Google/Graph, SSE, CalendarWebhook (задеплоена)
- [x] MAIL v1 — read-only inbox, «task from email» (в main)
- [x] TIMER — persistent focus timer + stats/streaks (в main через reland)
- [x] BOARD v1 — доски на существующих Task (в main через reland)
- [x] MOBILE — responsive shell + Today + bottom sheets (в main через reland)
- [x] AI-AGENT — copilot: тулзы boards/focus/mail, память, hosted+BYOK, reschedule preview (PR #2, смержен)
- [x] QA-hardening — баг-свип + харденинг после интеграции (PR #3, смержен). main зелёный: 364 теста, 56 миграций

---

## Трек A — ТЕХНИЧЕСКОЕ (твоими руками) — ФОКУС СЕЙЧАС

### A1. Домержить и задеплоить agent
- [ ] Merge PR #2 (`feat/ai-agent` → main)
- [ ] Coolify: redeploy **web + worker** до последнего main
- [ ] Миграции в проде: `DIRECT_URL="$DATABASE_URL" npx prisma@6.19.3 migrate deploy`
- [ ] (опц.) env hosted-AI: `NEEDT_AI_API_KEY`, `NEEDT_AI_MODEL` (GLM/DeepSeek)
- [ ] Смоук-тест use.needt.app: логин, календарь, boards, focus переживает навигацию, mail, AI chat

### A2. Оживить провайдеров (чтобы realtime/mail реально работали)
- [ ] Google Cloud: domain verification `use.needt.app` + scopes (`calendar`,`calendar.events`,`tasks`,`gmail.readonly`)
- [ ] Azure: Graph perms `Calendars.ReadWrite`,`offline_access`,`User.Read`,`Mail.Read` + client secret
- [ ] Redirect URIs на `use.needt.app`; переподключить Google/Outlook → проверить синк за секунды
- [ ] Прод-гигиена: 2 Scheduled Tasks (reschedule + sync-calendars) с `CRON_SECRET`

### A3. Разделить домены
- [ ] `needt.app` убрать с web-приложения (оставить `use.needt.app`), NEXTAUTH_URL/WEBHOOK_BASE_URL → use.needt.app
- [ ] `needt.app` под лендинг (после B2)

### A4. 💳 BILLING (Creem — Merchant of Record) — большая техническая задача
Провайдер решён: **Creem** (MoR, платит налоги за нас; 3.9%+40¢). Заменяем наследный Stripe-каркас.
**Твоими руками (Creem Dashboard):**
- [ ] Создать продукты: Pro Monthly $6, Pro Yearly $60 (trial 14d), Lifetime $79 (one-time) → product IDs
- [ ] API key + Webhook endpoint `https://use.needt.app/api/billing/webhook` → signing secret
- [ ] Env в Coolify (web): `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_PRO_MONTHLY`, `CREEM_PRODUCT_PRO_YEARLY`, `CREEM_PRODUCT_LIFETIME`
**Codex (PR #4, готово — ждёт merge):**
- [x] Checkout + Customer Portal + подписанные webhook→Subscription sync (по docs.creem.io)
- [x] Гейтинг лимитов Free/Pro (Calendars, Boards, Mail, AI, auto-scheduling, Focus Stats)
- [x] BillingSettings UI (Motion-style), Stripe SDK удалён
- [x] Бонус: prod-runtime на Prisma 6.3.1 (больше не тянет Prisma 7 — миграции в проде чисто)

---

## Трек B — ФОНОВЫЙ КОД (Codex) — пишем параллельно

### B1. Оживить приложение (убрать «пусто как у Motion») — СЛЕДУЮЩИЙ ПРОМТ
- [ ] Онбординг-визард: тема → рабочие часы → первые задачи → мини-туториал
- [ ] Seed-контент после регистрации (предзаполненные задачи в календаре, как Motion)
- [ ] Живые empty states (Timeline/Board/Space/Mail) вместо пустоты
- [ ] Пара дропнутых премиум-элементов (21st.dev / Aceternity / Magic UI)

### B2. Лендинг (v0)
- [ ] Прогнать `needt-landing-v0-prompt.md` в Apex-чате v0 (тёплый премиум, Calendar/Board/Focus демо)
- [ ] Перенос на needt.app (отдельный деплой), CTA → use.needt.app/login

### B3. Полиш и баги
- [ ] **entrypoint.sh: запинить `prisma@6`** — сейчас `npx prisma migrate deploy` тянет Prisma 7 и падает → авто-миграции на деплое не работают (пока мигрируем руками)
- [ ] **middleware: `Error fetching homepage setting: fetch failed`** — middleware фетчит недостижимый URL внутри контейнера, чинить
- [ ] Reschedule preview UX, event-чипы, hover нерабочих часов
- [ ] Мобилка вживую (375/768), no horizontal scroll
- [ ] Прогон eval дешёвой AI-модели на 10-15 командах

---

## Трек C — ЗАПУСК (после A+B)
- [ ] TODO-SYNC (нужен self-host Nango) — опционально до PH
- [ ] Онбординг-сид + waitlist → онбординг
- [ ] Product Hunt (после лендинга+онбординга), build-in-public посты
- [ ] Reddit/Discord ниши, сравнение-страницы SEO

---

## Ближайшие 3 действия
1. Merge PR #2 → deploy web+worker → миграции (A1).
2. Codex: BILLING-промт в фон (A4/B) + начать Stripe Dashboard.
3. Codex: онбординг-промт «оживить приложение» (B1) — я готовлю следующим.
