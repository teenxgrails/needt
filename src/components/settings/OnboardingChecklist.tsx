"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Check, Circle, LoaderCircle } from "lucide-react";

import { SettingsCard, SettingsSection } from "./SettingsSection";

type OnboardingStepId = "account" | "calendar" | "workspace" | "task";
type OnboardingStep = { id: OnboardingStepId; complete: boolean };

const STEP_DETAILS: Record<
  OnboardingStepId,
  { label: string; description: string; href: string; action: string }
> = {
  account: {
    label: "Account ready",
    description: "Your signed-in account is ready to use Needt.",
    href: "#account",
    action: "Review account",
  },
  calendar: {
    label: "Connect a calendar",
    description: "Add a calendar to bring your time into the planner.",
    href: "#calendars",
    action: "Open calendars",
  },
  workspace: {
    label: "Choose a workspace",
    description:
      "Your personal workspace is ready; create or join a shared one when needed.",
    href: "#workspace",
    action: "Open workspace",
  },
  task: {
    label: "Create your first task",
    description: "Add one task so Needt can help you plan what comes next.",
    href: "/tasks",
    action: "Open tasks",
  },
};

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<OnboardingStep[] | null>(null);

  useEffect(() => {
    void fetch("/api/onboarding", { cache: "no-store" })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ steps: OnboardingStep[] }>)
          : null
      )
      .then((data) => setSteps(data?.steps ?? []))
      .catch(() => setSteps([]));
  }, []);

  const completed = steps?.filter((step) => step.complete).length ?? 0;
  const allComplete = steps?.length === 4 && completed === 4;

  return (
    <SettingsSection
      title="Getting started"
      description="A small guide based on your real account and workspace data."
      showDescription
    >
      <SettingsCard className="divide-y divide-[var(--border-subtle)]">
        {steps === null ? (
          <div className="flex min-h-16 items-center gap-2 px-4 text-sm text-[var(--text-muted)]">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Checking setup
            progress…
          </div>
        ) : allComplete ? (
          <div className="flex min-h-16 items-center gap-2 px-4 text-sm text-[var(--text-secondary)]">
            <Check className="h-4 w-4 text-[var(--color-success)]" /> Your
            planner is ready.
          </div>
        ) : (
          (steps.length
            ? steps
            : [
                { id: "account" as const, complete: true },
                { id: "calendar" as const, complete: false },
                { id: "workspace" as const, complete: false },
                { id: "task" as const, complete: false },
              ]
          ).map((step) => {
            const detail = STEP_DETAILS[step.id];
            return (
              <div
                className="flex min-h-16 items-center gap-3 px-4 py-3"
                key={step.id}
              >
                {step.complete ? (
                  <Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{detail.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {detail.description}
                  </p>
                </div>
                {!step.complete && (
                  <Link
                    className="min-h-11 shrink-0 content-center text-right text-sm font-medium text-[var(--color-accent)]"
                    href={detail.href}
                  >
                    {detail.action}
                  </Link>
                )}
              </div>
            );
          })
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
