import { newDate } from "@/lib/date-utils";

export function failedPaymentMessage(input: {
  effectivePlan: "FREE" | "PRO" | "LIFETIME";
  currentPeriodEnd: string | null;
}) {
  if (input.effectivePlan !== "FREE" && input.currentPeriodEnd) {
    const date = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(newDate(input.currentPeriodEnd));
    return `Creem could not collect this payment. You keep paid access through ${date} while Creem retries. Update your payment method in Manage billing.`;
  }
  return "Creem could not collect this payment. Paid access is paused. Update your payment method in Manage billing to restore it.";
}
