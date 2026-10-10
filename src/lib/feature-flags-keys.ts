/**
 * Feature flag keys. Client-safe: no Prisma, no `crypto`. The evaluation
 * itself (`isFeatureEnabled`) is server-only and lives in `feature-flags.ts`.
 */
export const DESIGN_V3 = "design_v3";

/**
 * The v3 paywall's checkout button. Off unless a FeatureFlag row turns it on:
 * payments stay closed until the legal pages are published and the payment
 * provider's review passes. `GET /api/billing` reports it as `checkoutEnabled`.
 */
export const BILLING_CHECKOUT = "billing_checkout";
