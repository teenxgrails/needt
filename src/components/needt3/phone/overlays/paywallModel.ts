/**
 * The paywall's words and numbers, pure (paywall.jsx / paywall-sheet.jsx).
 *
 * Every price, the trial length and the lifetime cap come from
 * `priceStrings()` (`@/lib/needt3/pricing`), which reads `NEEDT_PRICING`
 * (`src/lib/creem/config.ts`) and nothing else. How many lifetime seats are
 * left is the server's to say (`usePlan().lifetimeAvailable` is all it sends),
 * so no seat count is ever spelled here.
 */
import type { BillingCheckoutSelection } from "@/lib/creem/config";
import type { PriceStrings } from "@/lib/needt3/pricing";

import { pwCta } from "./strings";

/* ---------- the sheet ---------- */

/** The cards: Pro (monthly or yearly, one card with a switch) and Lifetime. */
export type PwPick = "monthly" | "annual" | "lifetime";

/** A cycle name from outside ("monthly" | "annual" | "yearly" | "lifetime") → a pick. */
export function pickOf(cycle: string | null | undefined): PwPick {
  return cycle === "monthly" || cycle === "lifetime" ? cycle : "annual";
}

/** The button and the line under it for a pick (paywall-sheet.jsx `pwCtaFor`). */
export function ctaFor(pick: PwPick, p: PriceStrings) {
  if (pick === "lifetime")
    return {
      label: `Get Lifetime · ${p.lifetime}`,
      sub: pwCta.one_payment_pro_for_good,
    };
  return { label: p.trialCta, sub: `${p.trialShort}. ${p.trialTerms}` };
}

/** What `POST /api/billing/checkout` takes for a pick. */
export function checkoutBody(pick: PwPick): BillingCheckoutSelection {
  return pick === "lifetime"
    ? { plan: "lifetime" }
    : { plan: "pro", interval: pick === "monthly" ? "month" : "year" };
}

/** The Free plan's line and Pro's features, as paywall.jsx lists them. */
export const FREE_FEATURES = [
  "Tasks and projects",
  "Calendar",
  "Docs",
  "1 mail account",
] as const;
export const PRO_FEATURES: readonly (readonly [string, string | null])[] = [
  ["AI planning", "Plan my day and Ask Needt"],
  ["Every connection", "Mail, calendars, files — and MCP"],
  ["Unlimited moodboards", "With sharing"],
  ["Document themes", "And the Time theme"],
  ["Priority sync", null],
];

/** "Tasks and projects, calendar, docs, 1 mail account" */
export function freeSummary() {
  const s = FREE_FEATURES.join(", ").toLowerCase();
  return s.replace(/^./, (c) => c.toUpperCase());
}
