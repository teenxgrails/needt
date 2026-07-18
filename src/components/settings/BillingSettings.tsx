"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  type BillingCheckoutSelection,
  NEEDT_PRICING,
  formatBillingPrice,
} from "@/lib/creem/config";
import { cn } from "@/lib/utils";

import { SettingsSection } from "./SettingsSection";

type Plan = "FREE" | "PRO" | "LIFETIME";
type BillingStatus =
  | "ACTIVE"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "CANCELED"
  | "PAST_DUE";

interface UsageStatus {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  upgradeRequired: boolean;
  plan: Plan;
}

interface BillingSummary {
  configured: boolean;
  plan: Plan;
  status: BillingStatus;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canManageBilling: boolean;
  usage: {
    calendars: UsageStatus;
    autoScheduledTasks: UsageStatus;
    boards: UsageStatus;
    mailboxes: UsageStatus;
    aiActions: {
      used: number;
      limit: number;
      remaining: number;
      allowed: boolean;
      plan: Plan;
    };
  };
}

const PLAN_NAMES: Record<Plan, string> = {
  FREE: "Needt Free",
  PRO: "Needt Pro",
  LIFETIME: "Needt Lifetime",
};

const STATUS_LABELS: Record<BillingStatus, string> = {
  ACTIVE: "Active",
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_FAILED: "Payment failed",
  CANCELED: "Canceled",
  PAST_DUE: "Past due",
};

function usageLabel(usage: { used: number; limit: number | null }) {
  return usage.limit === null
    ? `${usage.used} used · Unlimited`
    : `${usage.used} of ${usage.limit}`;
}

function periodLabel(summary: BillingSummary) {
  if (summary.plan === "LIFETIME") return "One-time purchase";
  if (summary.plan === "FREE") return "No payment method required";
  if (!summary.currentPeriodEnd) {
    return summary.interval === "year" ? "Billed yearly" : "Billed monthly";
  }
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(summary.currentPeriodEnd));
  return summary.cancelAtPeriodEnd
    ? `Access continues until ${date}`
    : `Renews ${date}`;
}

export function BillingSettings() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    const response = await fetch("/api/billing");
    if (!response.ok) throw new Error("Could not load billing");
    setSummary((await response.json()) as BillingSummary);
    setLoadFailed(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSummary().catch(() => {
      if (!cancelled) setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  async function startCheckout(selection: BillingCheckoutSelection) {
    const action =
      selection.plan === "lifetime" ? "lifetime" : `pro-${selection.interval}`;
    setPendingAction(action);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Could not start checkout");
      }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout"
      );
      setPendingAction(null);
    }
  }

  async function openPortal() {
    setPendingAction("portal");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Could not open billing portal");
      }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open billing portal"
      );
      setPendingAction(null);
    }
  }

  if (!summary && !loadFailed) {
    return (
      <div className="max-w-[896px] space-y-8">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <SettingsSection
        title="Billing"
        description="Your planner keeps working even when billing is unavailable."
      >
        <div className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Billing details are temporarily unavailable. Try again in a moment.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => {
              setLoadFailed(false);
              void loadSummary();
            }}
          >
            Try again
          </Button>
        </div>
      </SettingsSection>
    );
  }

  const planIsPaid = summary.plan !== "FREE";
  const proPrice =
    interval === "year"
      ? NEEDT_PRICING.pro.year.amountCents
      : NEEDT_PRICING.pro.month.amountCents;

  return (
    <div className="max-w-[896px] space-y-10">
      <SettingsSection
        title="Plan"
        description="Payments and tax handling are securely managed by Creem."
      >
        <div className="rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">
                  {PLAN_NAMES[summary.plan]}
                </span>
                <span className="rounded-full bg-[var(--surface-control)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                  {STATUS_LABELS[summary.status]}
                </span>
                {summary.cancelAtPeriodEnd && (
                  <span className="rounded-full bg-[var(--surface-control)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    Cancels at period end
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                {periodLabel(summary)}
              </p>
              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Subscriptions can be canceled anytime from the customer portal.
              </p>
            </div>
            {summary.canManageBilling && (
              <Button
                variant="outline"
                disabled={pendingAction !== null}
                onClick={() => void openPortal()}
              >
                {pendingAction === "portal" && (
                  <Loader2 className="animate-spin" />
                )}
                Manage billing
              </Button>
            )}
          </div>
        </div>
        {!summary.configured && (
          <div className="mt-3 rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
            Purchases are not configured for this installation. Your current
            plan and planner data are unaffected.
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Choose a plan"
        description="Upgrade for unlimited planning, Mail, AI agent access, and Focus analytics."
      >
        <div
          aria-label="Pro billing interval"
          className="mb-4 inline-flex rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-control)] p-1"
          role="group"
        >
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={interval === value}
              className={cn(
                "h-7 rounded-[calc(var(--control-radius)-2px)] px-3 text-xs transition-colors",
                interval === value
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              onClick={() => setInterval(value)}
            >
              {value === "month" ? "Monthly" : "Yearly · 2 months free"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PlanCard
            name={NEEDT_PRICING.pro.name}
            price={`${formatBillingPrice(proPrice)}/${interval === "year" ? "year" : "month"}`}
            description={
              interval === "year"
                ? "$5/month billed annually"
                : "Flexible monthly subscription"
            }
            features={[
              "Unlimited calendars, boards, and auto-scheduling",
              "Up to 3 mailboxes",
              "AI agent and hosted AI actions",
              "Focus scores, streaks, and weekly analytics",
            ]}
            actionLabel={summary.plan === "PRO" ? "Current plan" : "Choose Pro"}
            disabled={
              !summary.configured ||
              summary.plan === "PRO" ||
              summary.plan === "LIFETIME" ||
              pendingAction !== null
            }
            loading={pendingAction === `pro-${interval}`}
            onAction={() => void startCheckout({ plan: "pro", interval })}
          />
          <PlanCard
            name={NEEDT_PRICING.lifetime.name}
            price={`${formatBillingPrice(NEEDT_PRICING.lifetime.amountCents)} once`}
            description="One payment, lifetime access"
            features={[
              "Everything in Pro",
              "No recurring subscription",
              "All future planner updates",
              "Lifetime plan badge",
            ]}
            actionLabel={
              summary.plan === "LIFETIME" ? "Current plan" : "Get Lifetime"
            }
            disabled={
              !summary.configured ||
              summary.plan === "LIFETIME" ||
              pendingAction !== null
            }
            loading={pendingAction === "lifetime"}
            onAction={() => void startCheckout({ plan: "lifetime" })}
          />
        </div>
        {!summary.configured && (
          <p className="mt-3 text-[12px] text-[var(--text-muted)]">
            Checkout buttons become available after the Creem product IDs and
            API key are configured.
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Included usage">
        <div className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <UsageRow
            label="Connected calendars"
            value={usageLabel(summary.usage.calendars)}
          />
          <UsageRow
            label="Auto-scheduled tasks this month"
            value={usageLabel(summary.usage.autoScheduledTasks)}
          />
          <UsageRow label="Boards" value={usageLabel(summary.usage.boards)} />
          <UsageRow
            label="Mailboxes"
            value={usageLabel(summary.usage.mailboxes)}
          />
          <UsageRow
            label="Hosted AI actions this month"
            value={
              summary.usage.aiActions.limit === 0
                ? "Available on Pro and Lifetime"
                : `${summary.usage.aiActions.used} of ${summary.usage.aiActions.limit}`
            }
          />
        </div>
        {!planIsPaid && (
          <p className="mt-3 text-[12px] leading-5 text-[var(--text-muted)]">
            Free includes one calendar, 15 auto-scheduled tasks per month, and
            one board. Focus timer sessions remain available without analytics.
          </p>
        )}
      </SettingsSection>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  actionLabel,
  disabled,
  loading,
  onAction,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  actionLabel: string;
  disabled: boolean;
  loading: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-80 flex-col rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
      <div className="text-[14px] font-semibold">{name}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{price}</div>
      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
        {description}
      </p>
      <div className="mt-5 flex-1 space-y-2.5 border-t border-[var(--border-subtle)] pt-4">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-start gap-2 text-[13px] leading-5 text-[var(--text-secondary)]"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 text-[var(--color-success)]" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <Button
        className="mt-5 w-full"
        variant="outline"
        disabled={disabled}
        onClick={onAction}
      >
        {loading && <Loader2 className="animate-spin" />}
        {actionLabel}
      </Button>
    </div>
  );
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
