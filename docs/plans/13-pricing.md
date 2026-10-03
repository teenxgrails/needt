# 13 — Pricing and plans

**Status:** active. Decided by the owner on 2026-09-15. It replaces every earlier
price: $6 Pro monthly, the $79 and $99 Lifetime, "first 100 people", and the
€9 / €180 / "20 months" figures in old landing drafts.

This is roadmap item P0.7, with the trial from P0.6. The work happens in a
worktree from `origin/main`, never in the design-port checkout.

---

## Decision

| Plan | Price | Notes |
| --- | --- | --- |
| Free | $0, forever | No hosted AI. The limits stay as in `src/lib/entitlements.ts` |
| Pro | **$7/month** or **$60/year** | The yearly plan works out to $5/month, 29% off. 14-day trial without a card |
| Lifetime | **$149 once**, forever | First 300 buyers, then it closes. Everything in Pro |

- **Trial:** 14 days of Pro, no card. When it ends, the account drops to Free
  and keeps all its data.
- **AI limits exist and are never shown.** No count of messages, actions or
  credits appears anywhere: app, landing, emails. The public wording is
  "AI included".
- **Pro and Lifetime get the same AI allowance.** Past it, AI slows down and
  suggests the user's own key. It does not stop with a number.

---

## Economics, computed 2026-09-15

Creem fee: 3.9% + $0.40 per charge ([creem.io/pricing](https://www.creem.io/pricing)).
Hosted AI: DeepSeek V4.1 Flash at peak rates
([api-docs.deepseek.com](https://api-docs.deepseek.com/quick_start/pricing)).
**Tokens per action are an estimate. Nothing in the code measures them yet.**

| Charge | Net after Creem |
| --- | --- |
| Pro $7/month | $6.33 |
| Pro $60/year | $57.26, which is $4.77/month |
| Lifetime $149 | $142.79; 300 buyers give $42,837 |

Hosted AI at 300 actions a month:

| User | AI cost/month | Margin, monthly payer | Margin, yearly payer | Months until a Lifetime buyer's payment is used up |
| --- | --- | --- | --- | --- |
| Light | $0.48 | $5.85 | $4.29 | 297.5 |
| Typical | $2.25 | $4.08 | $2.52 | 63.5 |
| Heavy | $10.50 | −$4.17 | −$5.73 | 13.6 |

Break-even AI cost per action at 300 a month: **$0.0211** for a monthly payer,
**$0.0159** for a yearly payer. If measured cost per action is above that, the
allowance comes down or the price goes up.

---

## Changes in code

### 1. Prices — `src/lib/creem/config.ts`

- `pro.month.amountCents`: `600` → `700`.
- `pro.year.amountCents`: `6_000`, unchanged.
- `lifetime.amountCents`: `7_900` → `14_900`.
- Update every test that asserts the old amounts.

### 2. Same AI allowance for Lifetime — `src/services/ai/usage.ts`

- `LIFETIME` cap default: `3_000` → `300`. Today a Lifetime buyer gets ten times
  Pro's allowance.
- Change the same value in `.env.example` and `ENV_TEMPLATE.md`.
- Production reads `NEEDT_AI_LIFETIME_ACTION_CAP` from its environment. The owner
  checks and sets it in Coolify; the read-only token cannot see values.

### 3. Soft limit instead of a stop

Past the monthly allowance, hosted AI keeps working in a slower mode until a
ceiling, then hands over to the user's own key.

| Usage this month | Behaviour | What the user sees |
| --- | --- | --- |
| Up to the allowance | Normal | Nothing |
| Allowance to 2× allowance | Slow mode: the request waits in a short queue, and `max_tokens` drops to 600 | "AI is busy, so replies may take a little longer. Add your own key for full speed." |
| Past 2× allowance | No hosted AI until the 1st | "AI is resting until the 1st. Add your own key to keep going." |

- The ceiling multiplier is a new environment setting, default `2`. It keeps the
  worst case bounded: a heavy user at 600 actions costs $21/month.
- A user's own key (BYOK) is never limited.
- Revisit the allowance and the multiplier after 30 days of token logs (item 6).

### 4. Hide every AI count

| Place | Today | Change |
| --- | --- | --- |
| `src/components/ai/AIChatSurface.tsx:460` | `{remaining}/{limit} actions left` | Remove |
| `src/components/settings/AIAssistantSettings.tsx:498` | `{remaining}/{limit} actions left` | Remove |
| `src/components/settings/BillingSettings.tsx:75-77` | `N used · Unlimited` / `N of M` | Remove for AI usage |
| `src/components/settings/BillingSettings.tsx:354` | "Hosted AI actions this month" meter | Remove |
| `src/components/settings/BillingSettings.tsx:295` | "AI agent and hosted AI actions" | "AI agent" |

- The API may keep returning usage for internal use; no component renders a
  number from it.
- Add a UI-contract test that fails if "actions left" or an AI usage meter
  comes back.

### 5. Trial — P0.6

- Every new account starts with 14 days of Pro at sign-up, no card, one trial
  per verified email.
- Check whether `SubscriptionStatus` already has a trial state. If not, add one,
  or an additive `trialEndsAt`, and make `effectiveSubscriptionPlan` return
  `PRO` while the trial runs.
- Emails through the existing worker and Resend: on day 11 and on day 14, each
  with a button to pay. No usage numbers in either.
- When the trial ends: plan `FREE`. Nothing is deleted. Anything over the Free
  limits stays visible and stops auto-scheduling; the limits apply to new
  actions only.
- Do not use Creem's trial. It charges automatically when the trial ends, which
  implies a card at sign-up — an inference from
  [docs.creem.io/features/trials](https://docs.creem.io/features/trials), not a
  sentence it states.

### 6. Measure tokens

- Add additive `inputTokens` and `outputTokens` counters to `AiUsage`, filled
  from each provider response's `usage` field.
- Leave them out of the UI. They exist to check the break-even above.

### 7. Model name

- The hosted default is `deepseek-chat`. DeepSeek announced its discontinuation
  for 2026-07-24; its change log still maps it to V4.1 Flash on 2026-09-10.
- Set `NEEDT_AI_MODEL` to the current name on DeepSeek's pricing page. Verify it
  with one live call before changing production.

### 8. The 300-buyer cap on Lifetime

- Check whether the checkout enforces a cap today. If not: count active
  `LIFETIME` subscriptions and disable the Lifetime checkout at 300, with a
  "Lifetime is closed" state.
- No remaining-spots counter unless the owner asks for one.

---

## Owner only

- Creem products: Pro monthly $7, Pro yearly $60, Lifetime $149. Whether an
  existing Creem product's price can be edited or needs a new product ID is not
  checked. With new IDs, update `CREEM_PRODUCT_PRO_MONTHLY` and
  `CREEM_PRODUCT_LIFETIME` in Coolify.
- Terms: add a fair-use clause for hosted AI, without numbers. Part of the
  owner-approved legal copy (P1.5).

## Copy

- Live landing, branch `landing`, `landing/src/sections/Pricing.tsx`: `$6` →
  `$7`; Lifetime `$79` with a struck-through `$149` → `$149` with no strike;
  "first 100 people" → "first 300 people".
- Claude Design landing: `landing/for-claude-design/CLAUDE-DESIGN-COPY-PROMPT.md`,
  corrected by the 2026-09-15 docs refresh.
- Everywhere: "AI included", never a number.

## Order

1. Items 1, 2, 4 and 6 in one PR.
2. Item 3.
3. Item 5, the trial.
4. Item 7 with a live check, then item 8.
5. Owner changes Creem; the landing prices change in the same release.
