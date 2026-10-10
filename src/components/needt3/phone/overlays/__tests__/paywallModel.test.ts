import { NEEDT_PRICING } from "@/lib/creem/config";
import { lifetimeLeftLine, money, priceStrings } from "@/lib/needt3/pricing";

import { checkoutBody, ctaFor, freeSummary, pickOf } from "../paywallModel";

describe("the strings come from the one pricing module", () => {
  const p = priceStrings();

  it("reads the prices, the trial and the cap from NEEDT_PRICING, never typed", () => {
    expect(p.monthly).toBe(money(NEEDT_PRICING.pro.month.amountCents));
    expect(p.yearly).toBe(money(NEEDT_PRICING.pro.year.amountCents));
    expect(p.lifetime).toBe(money(NEEDT_PRICING.lifetime.amountCents));
    expect(p.trialDays).toBe(NEEDT_PRICING.trialDays);
    expect(p.lifetimeCap).toBe(NEEDT_PRICING.lifetime.cap);
  });
});

describe("the lifetime line never invents a seat count", () => {
  it("is the cap alone while the server has sent no count", () => {
    expect(lifetimeLeftLine(null, 300)).toBe("First 300 buyers");
    expect(lifetimeLeftLine(undefined, 300)).toBe("First 300 buyers");
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
