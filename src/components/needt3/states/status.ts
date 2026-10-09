import { newDate } from "@/lib/date-utils";
import type { V3Plan } from "@/lib/needt3/hooks/plan";

export interface ScreenQuery {
  status: "pending" | "error" | "success";
  fetchStatus: "fetching" | "paused" | "idle";
  data: unknown;
  error: unknown;
  refetch: () => unknown;
}

export function screenState(query: ScreenQuery) {
  const status =
    query.error && typeof query.error === "object" && "status" in query.error
      ? query.error.status
      : undefined;
  // Lost permission must hide even a previously cached response.
  if (query.status === "error" && status === 403) return "no-access";
  if (query.data !== undefined) return "content";
  if (query.fetchStatus === "paused") return "offline";
  if (query.status === "pending") return "loading";
  if (query.status === "error") return "error";
  return "content";
}

export function accountState(plan: V3Plan | undefined, now: number) {
  if (!plan) return "none";
  if (plan.paymentFailed) return "payment-failed";
  if (
    plan.kind === "trial" &&
    plan.trialDaysLeft !== null &&
    plan.trialDaysLeft <= 3
  )
    return "trial-ending";
  if (
    plan.kind === "free" &&
    plan.trialEndsAt &&
    newDate(plan.trialEndsAt).getTime() <= now
  )
    return "trial-ended";
  return "none";
}

export function aiExhausted(plan: V3Plan | undefined) {
  if (
    !plan ||
    !("usage" in plan) ||
    !plan.usage ||
    typeof plan.usage !== "object" ||
    !("aiActions" in plan.usage)
  )
    return false;
  const ai = plan.usage.aiActions;
  return Boolean(
    ai && typeof ai === "object" && "exhausted" in ai && ai.exhausted === true
  );
}
