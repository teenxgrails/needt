/**
 * Paywall logic: which plan is picked, what the call to action says, what a
 * plan is called. Pure. Every number and price string comes from the one
 * module (`NEEDT_PRICING` via `priceStrings` in ./pricing); "N of 300 left" is
 * the server's count (`GET /api/billing` -> `lifetimeLeft`), never a constant.
 */
import type { V3Plan } from "./hooks/plan";
import { priceStrings } from "./pricing";

const PRICE = priceStrings();
const PRICE_CAP = PRICE.lifetimeCap;

/** The meter's fill, 0-100, or null when the server has not counted. */
export function lifetimeLeftPct(
  left: number | null | undefined
): number | null {
  if (left == null || !Number.isFinite(left)) return null;
  const n = Math.max(0, Math.min(PRICE_CAP, Math.floor(left)));
  return Math.round((n / PRICE_CAP) * 100);
}

/** The paywall's plan picks: "monthly" | "annual" (Pro yearly) | "lifetime". */
const TRIAL_AFTER =
  "When the trial ends you go back to Free unless you choose a plan — we’ll remind you 3 days before.";

export type PaywallPick = "monthly" | "annual" | "lifetime";

export function paywallPick(value: unknown): PaywallPick {
  return value === "monthly" || value === "lifetime" ? value : "annual";
}

/** What a pick sends to `POST /api/billing/checkout`. */
export function checkoutSelection(pick: PaywallPick) {
  if (pick === "lifetime") return { plan: "lifetime" as const };
  return {
    plan: "pro" as const,
    interval: pick === "monthly" ? ("month" as const) : ("year" as const),
  };
}

export interface PaywallCta {
  label: string;
  sub: string;
  /** Why the button is off, shown in place of `sub`; null when it works. */
  blocked: string | null;
}

type PlanFacts = Pick<
  V3Plan,
  "kind" | "configured" | "lifetimeAvailable"
> | null;

/**
 * The call to action under the plan cards.
 *
 * The prototype's button started the trial on the spot. Here the trial is
 * granted by the server when the account's email is confirmed, so there is no
 * "start" to press: Pro buttons go to checkout and say so, and the trial is
 * described, not sold. Payments that are not configured turn the button off
 * and say why; nothing pretends to succeed.
 */
export function paywallCta(pick: PaywallPick, plan: PlanFacts): PaywallCta {
  const kind = plan?.kind ?? "free";
  const owned =
    (pick === "lifetime" && kind === "lifetime") ||
    (pick !== "lifetime" &&
      (kind === "monthly" || kind === "yearly") &&
      plan !== null);
  const base =
    pick === "lifetime"
      ? {
          label: `Get Lifetime · ${PRICE.lifetime}`,
          sub: "One payment · Pro for good",
        }
      : pick === "monthly"
        ? {
            label: `Choose Pro · ${PRICE.monthly} / month`,
            sub: kind === "trial" ? TRIAL_AFTER : PRICE.trialShort,
          }
        : {
            label: `Choose Pro · ${PRICE.yearly} / year`,
            sub: kind === "trial" ? TRIAL_AFTER : PRICE.trialShort,
          };

  if (kind === "lifetime") {
    return {
      ...base,
      label: "Lifetime is yours",
      blocked: "Thank you — Pro for good.",
    };
  }
  if (owned) {
    return {
      ...base,
      label: "Current plan",
      blocked: "This is the plan you are on.",
    };
  }
  if (plan && !plan.configured) {
    return {
      ...base,
      blocked: "Checkout opens soon. Nothing is charged until it does.",
    };
  }
  if (pick === "lifetime" && plan && !plan.lifetimeAvailable) {
    return {
      ...base,
      label: "Lifetime is closed",
      blocked: `All ${PRICE_CAP} Lifetime plans are taken.`,
    };
  }
  return { ...base, blocked: null };
}

/** The one-line summary of a plan for the account banner and Settings. */
export function planLine(plan: Pick<V3Plan, "kind" | "trialDaysLeft">): string {
  switch (plan.kind) {
    case "trial": {
      const n = plan.trialDaysLeft;
      return n == null
        ? "Pro trial"
        : `Pro trial · ${n} ${n === 1 ? "day" : "days"} left`;
    }
    case "monthly":
      return `Pro · ${PRICE.monthly} / month`;
    case "yearly":
      return `Pro · ${PRICE.yearly} / year`;
    case "lifetime":
      return "Lifetime · thank you";
    default:
      return "Free";
  }
}

/** Pro features are on for the trial and every paid plan. */
export function isPro(kind: V3Plan["kind"] | undefined | null): boolean {
  return (
    kind === "trial" ||
    kind === "monthly" ||
    kind === "yearly" ||
    kind === "lifetime"
  );
}

export interface ProLimitFacts {
  used: number;
  max: number;
  noun: string;
}

/** "1 of 1 mail accounts" / "3 boards · Free includes 1" (ProLimit). */
export function proLimitText({ used, max, noun }: ProLimitFacts): string {
  return used > max
    ? `${used} ${noun} · Free includes ${max}`
    : `${used} of ${max} ${noun}`;
}

/** The "Upgrade for more" link shows once the Free allowance is used up. */
export function proLimitFull({ used, max }: ProLimitFacts): boolean {
  return used >= max;
}
