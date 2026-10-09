"use client";

import type { ReactNode } from "react";

import { FiClock, FiCreditCard, FiLock, FiStar } from "react-icons/fi";

import { newDate } from "@/lib/date-utils";
import { usePlan } from "@/lib/needt3/hooks/plan";

import strings from "../../../../docs/port/prototype/port/strings/en.json";
import { useDesignV3 } from "../root/V3Root";
import { accountState, aiExhausted } from "./status";

const copy = strings["states.jsx"].stBannerSpecs;

export function StBanner({
  title,
  body,
  icon,
  tone = "neutral",
  action,
}: {
  title: string;
  body?: string;
  icon: ReactNode;
  tone?: "neutral" | "attention";
  action?: ReactNode;
}) {
  return (
    <div
      className={`st-banner${tone === "attention" ? " is-attention" : ""}`}
      role={tone === "attention" ? "alert" : "status"}
      data-st-banner={tone}
    >
      <span className="st-banner-icon">{icon}</span>
      <span className="st-banner-text">
        <span className="st-banner-title">{title}</span>
        {body ? <span className="st-banner-body">{body}</span> : null}
      </span>
      {action ? <span className="st-banner-actions">{action}</span> : null}
    </div>
  );
}

export function StBannerStack({
  onSeePlans,
  screen,
}: {
  onSeePlans?: () => void;
  screen?: string;
}) {
  const plan = usePlan();
  const enabled = useDesignV3();
  const state = accountState(plan.data, newDate().getTime());
  const exhausted = screen === "today" && aiExhausted(plan.data);
  if (!enabled || (state === "none" && !exhausted)) return null;
  const label =
    state === "payment-failed"
      ? copy.update_payment
      : state === "trial-ending"
        ? copy.upgrade
        : copy.see_plans;
  const action = onSeePlans ? (
    <button
      type="button"
      className="nx-btn nx-btn-secondary nx-btn-sm"
      onClick={onSeePlans}
    >
      {label}
    </button>
  ) : null;
  return (
    <div className="st-banners" data-st-banners>
      {state === "none" ? null : state === "payment-failed" ? (
        <StBanner
          tone="attention"
          icon={<FiCreditCard size={15} aria-hidden />}
          title={copy.payment_failed_update_your_card_to_keep_}
          action={action}
        />
      ) : state === "trial-ended" ? (
        <StBanner
          icon={<FiLock size={15} aria-hidden />}
          title={copy.trial_ended_ai_planning_and_themes_are_n}
          body={copy.everything_you_made_stays_yours_and_edit}
          action={action}
        />
      ) : (
        <StBanner
          icon={<FiStar size={15} aria-hidden />}
          title={`Pro trial ends in ${plan.data?.trialDaysLeft} ${plan.data?.trialDaysLeft === 1 ? "day" : "days"}`}
          action={action}
        />
      )}
      {exhausted ? (
        <StBanner
          icon={<FiClock size={15} aria-hidden />}
          title="AI planning is paused — your tasks and calendar still work"
        />
      ) : null}
    </div>
  );
}
