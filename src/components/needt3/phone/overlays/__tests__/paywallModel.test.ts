import { NEEDT_PRICING } from "@/lib/creem/config";

import {
  checkoutBody,
  ctaFor,
  freeSummary,
  lifetimeLeftLine,
  money,
  pickOf,
  priceStrings,
} from "../paywallModel";

describe("priceStrings (from NEEDT_PRICING, never typed)", () => {
  const p = priceStrings();

  it("reads the prices, the trial and the cap from the one module", () => {
    expect(p.monthly).toBe(money(NEEDT_PRICING.pro.month.amountCents));
    expect(p.yearly).toBe(money(NEEDT_PRICING.pro.year.amountCents));
    expect(p.lifetime).toBe(money(NEEDT_PRICING.lifetime.amountCents));
    expect(p.trialDays).toBe(NEEDT_PRICING.trialDays);
    expect(p.lifetimeCap).toBe(NEEDT_PRICING.lifetime.cap);
  });

  it("derives the yearly saving", () => {
    expect(p).toMatchObject({
      monthly: "$7",
      yearly: "$59",
      lifetime: "$149",
      yearlyPerMonth: "$4.92",
      saveAmount: "$25",
      savePct: 30,
      trialDays: 14,
      lifetimeCap: 300,
    });
    expect(p.trialCta).toBe("Start 14-day free trial");
    expect(p.footnote).toBe("Prices in USD. Taxes may apply.");
  });

  it("takes any pricing, so a test or a new plan changes every string at once", () => {
    const q = priceStrings({
      currency: "EUR",
      trialDays: 7,
      pro: { month: { amountCents: 1000 }, year: { amountCents: 9600 } },
      lifetime: { amountCents: 20000, cap: 100 },
    });
    expect(q).toMatchObject({
      monthly: "$10",
      yearly: "$96",
      yearlyPerMonth: "$8",
      saveAmount: "$24",
      savePct: 20,
      lifetimeCap: 100,
      trialCta: "Start 7-day free trial",
      footnote: "Prices in EUR. Taxes may apply.",
    });
  });
});

describe("the lifetime line never invents a seat count", () => {
  it("is the cap alone while the server has sent no count", () => {
    expect(lifetimeLeftLine(null, 300)).toBe("First 300 buyers");
    expect(lifetimeLeftLine(undefined, 300)).toBe("First 300 buyers");
  });
  it("uses a count only when one is given", () => {
    expect(lifetimeLeftLine(41, 300)).toBe("41 of 300 left");
    expect(lifetimeLeftLine(-2, 300)).toBe("0 of 300 left");
  });
});

describe("the call to action", () => {
  const p = priceStrings();
  it("Pro starts the trial and says what happens after it", () => {
    const c = ctaFor("annual", p);
    expect(c.label).toBe("Start 14-day free trial");
    expect(c.sub).toContain("14 days free · no card needed.");
    expect(c.sub).toContain("go back to Free unless you choose a plan");
    expect(ctaFor("monthly", p)).toEqual(c);
  });
  it("Lifetime is one payment", () => {
    expect(ctaFor("lifetime", p)).toEqual({
      label: "Get Lifetime · $149",
      sub: "One payment · Pro for good",
    });
  });
});

describe("checkout", () => {
  it("sends the plan the server's schema takes", () => {
    expect(checkoutBody("monthly")).toEqual({ plan: "pro", interval: "month" });
    expect(checkoutBody("annual")).toEqual({ plan: "pro", interval: "year" });
    expect(checkoutBody("lifetime")).toEqual({ plan: "lifetime" });
  });
  it("pickOf: yearly is the default card", () => {
    expect(pickOf(undefined)).toBe("annual");
    expect(pickOf("yearly")).toBe("annual");
    expect(pickOf("monthly")).toBe("monthly");
    expect(pickOf("lifetime")).toBe("lifetime");
  });
  it("the free plan's line", () => {
    expect(freeSummary()).toBe(
      "Tasks and projects, calendar, docs, 1 mail account"
    );
  });
});
