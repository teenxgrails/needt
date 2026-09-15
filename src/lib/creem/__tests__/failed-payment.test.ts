import { failedPaymentMessage } from "@/lib/creem/failed-payment";

describe("failed payment notice", () => {
  it("explains retained access and the recovery action during retries", () => {
    expect(
      failedPaymentMessage({
        effectivePlan: "PRO",
        currentPeriodEnd: "2099-08-01T00:00:00.000Z",
      })
    ).toMatch(
      /^Creem could not collect this payment\. You keep paid access through .+ while Creem retries\. Update your payment method in Manage billing\.$/
    );
  });

  it("explains that paid access is paused after the grace boundary", () => {
    expect(
      failedPaymentMessage({
        effectivePlan: "FREE",
        currentPeriodEnd: null,
      })
    ).toContain("Paid access is paused");
  });
});
