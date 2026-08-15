# Needt — BILLING (Creem, Merchant of Record) FINAL Codex prompt — 2026-07-18

Провайдер: **Creem** (MoR — платит налоги за нас). Ветка `feat/billing` от актуального main.
Скопируй блок «CODEX PROMPT». Ручные шаги (Creem Dashboard) — внизу.

---

## Сверено с кодом (main)
- Существующий billing — **наследие форка, Stripe + только LIFETIME**: `SubscriptionPlan` = FREE, LIFETIME (нет PRO);
  `src/lib/stripe/*`, `api/billing/route.ts` (GET-сводка), `BillingSettings.tsx`. `stripe/index.ts` кидает
  ошибку при отсутствии ключа (мина). Всё это заменяем на Creem.
- `Subscription`-модель: userId(unique), plan, status, stripeCustomerId, stripePaymentIntentId, amount, discountApplied.
  Нет полей подписки — добавим (провайдер-агностик / Creem).
- Цены Needt: Pro $6/мес, $60/год (14-дн триал); Lifetime $79 one-time; Free без оплаты.
- Гейтинг-заглушки заложены (`canCreateBoard` //todo; авто-план 15/мес; mail 3 ящика; AiUsage cap) — подключить.

## CODEX PROMPT

```
Implement billing for Needt using CREEM as the payment provider (Creem is a Merchant of Record — it
collects and remits all taxes; we never handle VAT). Replace the inherited Stripe/lifetime-only scaffold.
Branch from current main. Read FIRST: src/lib/stripe/*, src/app/api/billing/route.ts,
src/components/settings/BillingSettings.tsx, and the Subscription model + SubscriptionPlan/SubscriptionStatus
enums in prisma/schema.prisma. Use Creem's official TypeScript SDK + Next.js adapter and follow the current
Creem API/webhook docs at https://docs.creem.io (map exact endpoint/event/field names from the live docs —
do not guess). Follow CLAUDE.md conventions (prisma singleton, @/lib/date-utils, logger+LOG_SOURCE, await
params, auth patterns, house UI). Update CHANGELOG.md under [unreleased].

PRICING (single source of truth in config; Creem product/price IDs come from env — never hardcode amounts):
- Free: $0.
- Pro: $6/month or $60/year (NO free trial — the Free tier is the trial).
- Lifetime: $79 one-time.

REPLACE STRIPE WITH CREEM:
- New src/lib/creem/ (client + config). Lazy/guarded init: do NOT throw at module import when CREEM_API_KEY
  is unset — the app must build and run with billing "not configured" (neutral empty state in Settings,
  same pattern as unconfigured calendar providers). Remove or retire the Stripe client so nothing imports
  a throwing module. Keep Stripe deps out of the runtime path.

PRISMA (new migration):
- Extend SubscriptionPlan: add PRO (keep FREE, LIFETIME).
- Extend SubscriptionStatus: add CANCELED, PAST_DUE (keep existing). No trial status needed.
- Extend Subscription: add creemCustomerId (unique, nullable), creemSubscriptionId (unique, nullable),
  creemProductId, interval (month|year|null), currentPeriodEnd DateTime?, cancelAtPeriodEnd Boolean @default(false).
  Keep the model provider-neutral where practical; the old stripe* fields may stay nullable/deprecated or be
  renamed — do not break existing rows.

ROUTES (Next 15, params as Promise):
- POST /api/billing/checkout: body { plan:"pro", interval:"month"|"year" } → create a Creem checkout for the
  recurring product (no trial); body { plan:"lifetime" } → Creem one-time checkout. Pass our userId
  as metadata/customer reference. Return the hosted checkout URL (redirect flow).
- POST /api/billing/portal: create a Creem customer portal session for the user's creemCustomerId.
- POST /api/billing/webhook: verify the Creem webhook signature (CREEM_WEBHOOK_SECRET); handle the
  checkout-completed, subscription active/updated/canceled/paid, and payment-failed events (use the exact
  event names from docs.creem.io). Upsert the user's Subscription (plan, status, creemCustomerId,
  creemSubscriptionId, creemProductId, interval, currentPeriodEnd, cancelAtPeriodEnd; lifetime → plan LIFETIME).
  Idempotent; never trust the client for plan; log via logger+LOG_SOURCE.

ENTITLEMENTS (single source of truth — src/lib/entitlements.ts):
- getPlan(userId) + a per-plan limits map. Enforce server-side and wire into existing hooks:
  * Free: 1 connected calendar, 15 auto-scheduled tasks / month, 1 board, 0 mailboxes, no AI agent.
  * Pro/Lifetime: unlimited calendars/boards/auto-scheduling, up to 3 mailboxes, AI agent on, focus stats.
  * Replace the //todo in canCreateBoard(userId) with a real check; add canAutoScheduleMore(userId)
    (monthly count vs 15), canAddMailbox(userId) (<=3), and gate the AI agent + hosted AiUsage cap
    (reuse the AI agent's canUseHostedAi). Return {allowed, limit, used, upgradeRequired}.

UI — BillingSettings.tsx (house format):
- Current plan + status + renewal date, and a "cancel anytime" note. Monthly/Yearly toggle (Yearly = "2 months free").
- Upgrade buttons → /api/billing/checkout (redirect to Creem); "Manage billing" → /api/billing/portal;
  Lifetime option. Usage rows (auto-scheduled X/15, mailboxes X/3, AI actions X/cap). Neutral
  "billing not configured" state when Creem env is absent.

ENV: CREEM_API_KEY, CREEM_WEBHOOK_SECRET, CREEM_PRODUCT_PRO_MONTHLY, CREEM_PRODUCT_PRO_YEARLY,
CREEM_PRODUCT_LIFETIME (and CREEM_API_URL if the SDK needs test vs live). Update .env.example + ENV_TEMPLATE.md.

OUT OF SCOPE: affiliates, revenue splits, team/seat billing, tax config (Creem MoR handles tax).

ACCEPTANCE (all green): lint (0 warnings), type-check, test:unit, build, build:worker, docker build;
migration applies on a clean DB; app builds/runs with Creem env UNSET (no import-time crash). Unit tests:
webhook event → Subscription mapping (fixtures), entitlement limit checks per plan, checkout mode selection.
One PR from feat/billing into main; CHANGELOG.md updated.
```

---

## Ручное (Creem Dashboard) — параллельно с Codex
- Создать продукты: **Pro Monthly $6**, **Pro Yearly $60** (recurring, без триала), **Lifetime $79** (one-time) → взять их product IDs.
- API key + Webhook endpoint `https://use.needt.app/api/billing/webhook` → signing secret.
- Env в Coolify (web): `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_PRO_MONTHLY`, `CREEM_PRODUCT_PRO_YEARLY`, `CREEM_PRODUCT_LIFETIME`.
- Тест в Creem test mode → потом live.

## Прайсинг-напоминание
Фикс 40¢/транзакция бьёт по $6/мес (~10.5%). Годовой $60 (~4.6%) и Lifetime $79 (~4.4%) выгоднее —
делай их визуально главными, месячный подавай как дорогой вариант.
