/**
 * The paywall's words and numbers, pure (paywall.jsx / paywall-sheet.jsx).
 *
 * Every price, the trial length and the lifetime cap are read from
 * `NEEDT_PRICING` (`src/lib/creem/config.ts`) and from nothing else. How many
 * lifetime seats are left is the server's to say (`usePlan().lifetimeAvailable`
 * is all it sends), so no seat count is ever spelled here.
 *
 * //todo: `priceStrings` / `money` / `lifetimeLeftLine` are the same three
 * functions PR #95 adds as `src/lib/needt3/pricing.ts`. They are derived here
 * only so this branch stands alone; once that file is in, delete this block
 * and import it (the signatures are identical).
 */
import {
  type BillingCheckoutSelection,
  NEEDT_PRICING,
} from "@/lib/creem/config";

import { pwCta, pwModule } from "./strings";

/** "$7", "$4.92": whole dollars when whole, cents when not. */
export function money(cents: number) {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export interface PriceStrings {
  monthly: string;
  yearly: string;
  lifetime: string;
  /** The yearly price per month, "$4.92". */
  yearlyPerMonth: string;
  /** What yearly saves against twelve months, "$25". */
  saveAmount: string;
  savePct: number;
  trialDays: number;
  lifetimeCap: number;
  trialCta: string;
  trialShort: string;
  trialTerms: string;
  footnote: string;
}

/** The slice of NEEDT_PRICING the strings need; a test can pass its own. */
export interface PricingInput {
  currency: string;
  trialDays: number;
  pro: {
    month: { amountCents: number };
    year: { amountCents: number };
  };
  lifetime: { amountCents: number; cap: number };
}

export function priceStrings(P: PricingInput = NEEDT_PRICING): PriceStrings {
  const month = P.pro.month.amountCents;
  const year = P.pro.year.amountCents;
  const save = month * 12 - year;
  return {
    monthly: money(month),
    yearly: money(year),
    lifetime: money(P.lifetime.amountCents),
    yearlyPerMonth: money(year / 12),
    saveAmount: money(save),
    savePct: Math.round((save / (month * 12)) * 100),
    trialDays: P.trialDays,
    lifetimeCap: P.lifetime.cap,
    trialCta: `Start ${P.trialDays}-day free trial`,
    trialShort: `${P.trialDays} days free · no card needed`,
    trialTerms: pwModule.when_the_trial_ends_you_go_back_to_free_,
    footnote: `Prices in ${P.currency}. Taxes may apply.`,
  };
}

/** "212 of 300 left" from the server's count, or the cap alone while unknown. */
export function lifetimeLeftLine(left: number | null | undefined, cap: number) {
  if (left === null || left === undefined) return `First ${cap} buyers`;
  return `${Math.max(0, left)} of ${cap} left`;
}

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
