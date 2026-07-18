export const NEEDT_PRICING = {
  free: {
    name: "Free",
    amountCents: 0,
  },
  pro: {
    name: "Pro",
    month: {
      amountCents: 600,
      productEnv: "CREEM_PRODUCT_PRO_MONTHLY",
    },
    year: {
      amountCents: 6_000,
      productEnv: "CREEM_PRODUCT_PRO_YEARLY",
    },
  },
  lifetime: {
    name: "Lifetime",
    amountCents: 7_900,
    productEnv: "CREEM_PRODUCT_LIFETIME",
  },
} as const;

export type BillingCheckoutSelection =
  | { plan: "pro"; interval: "month" | "year" }
  | { plan: "lifetime"; interval?: never };

export type CreemProductIds = {
  proMonthly: string | null;
  proYearly: string | null;
  lifetime: string | null;
};

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function getCreemProductIds(): CreemProductIds {
  return {
    proMonthly: envValue(NEEDT_PRICING.pro.month.productEnv),
    proYearly: envValue(NEEDT_PRICING.pro.year.productEnv),
    lifetime: envValue(NEEDT_PRICING.lifetime.productEnv),
  };
}

export function getCreemProductId(
  selection: BillingCheckoutSelection,
  products = getCreemProductIds()
): string | null {
  if (selection.plan === "lifetime") return products.lifetime;
  return selection.interval === "year"
    ? products.proYearly
    : products.proMonthly;
}

export function isCreemConfigured(): boolean {
  const products = getCreemProductIds();
  return Boolean(
    process.env.CREEM_API_KEY?.trim() &&
      process.env.CREEM_WEBHOOK_SECRET?.trim() &&
      products.proMonthly &&
      products.proYearly &&
      products.lifetime
  );
}

export function isCreemClientConfigured(): boolean {
  return Boolean(process.env.CREEM_API_KEY?.trim());
}

export function isCreemWebhookConfigured(): boolean {
  return Boolean(process.env.CREEM_WEBHOOK_SECRET?.trim());
}

export function formatBillingPrice(amountCents: number): string {
  return `$${Math.round(amountCents / 100)}`;
}
