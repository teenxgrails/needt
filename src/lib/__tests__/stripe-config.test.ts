describe("Stripe configuration", () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalSecret;
    }
    jest.resetModules();
  });

  it("can be imported when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const stripe = await import("@/lib/stripe");

    expect(stripe.isStripeConfigured()).toBe(false);
    expect(() => stripe.getStripe()).toThrow("Stripe is not configured.");
  });
});
