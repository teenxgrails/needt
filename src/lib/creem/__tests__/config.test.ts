import { formatBillingPrice, NEEDT_PRICING } from "../config";

describe("Needt pricing catalog", () => {
  it("keeps the approved public prices", () => {
    expect(NEEDT_PRICING.pro.month.amountCents).toBe(700);
    expect(NEEDT_PRICING.pro.year.amountCents).toBe(6_000);
    expect(NEEDT_PRICING.lifetime.amountCents).toBe(14_900);
    expect(formatBillingPrice(NEEDT_PRICING.pro.month.amountCents)).toBe("$7");
    expect(formatBillingPrice(NEEDT_PRICING.pro.year.amountCents)).toBe("$60");
    expect(formatBillingPrice(NEEDT_PRICING.lifetime.amountCents)).toBe("$149");
  });
});
