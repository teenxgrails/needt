"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

const LOG_SOURCE = "WeeklyFocusTarget";

type FocusTarget = {
  target: { targetMinutes: number; weekStartsOn: number };
  completedMinutes: number;
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours}h${remainder ? ` ${remainder}m` : ""}`
    : `${remainder}m`;
}

export function WeeklyFocusTarget() {
  const [target, setTarget] = useState<FocusTarget | null>(null);
  const [minutes, setMinutes] = useState("300");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/focus/target", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load focus target");
      const data = (await response.json()) as FocusTarget;
      setTarget(data);
      setMinutes(String(data.target.targetMinutes));
    } catch (error) {
      void logger.error(
        "Failed to load weekly focus target",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const targetMinutes = Number(minutes);
    if (
      !target ||
      !Number.isInteger(targetMinutes) ||
      targetMinutes < 0 ||
      saving
    )
      return;
    setSaving(true);
    try {
      const response = await fetch("/api/focus/target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMinutes,
          weekStartsOn: target.target.weekStartsOn,
        }),
      });
      if (!response.ok) throw new Error("Could not save focus target");
      await load();
      notify.success("Weekly focus target updated");
    } catch (error) {
      notify.error("Could not update weekly focus target");
      void logger.error(
        "Failed to save weekly focus target",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;
  const progress = target.target.targetMinutes
    ? Math.min(
        100,
        (target.completedMinutes / target.target.targetMinutes) * 100
      )
    : 0;

  return (
    <section className="border-b border-[var(--border-subtle)] py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Weekly target
          </p>
          <h2 className="mt-1 font-semibold">
            {formatMinutes(target.completedMinutes)} focused
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="weekly-focus-target">
            Weekly focus minutes
          </label>
          <Input
            id="weekly-focus-target"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="h-8 w-20 text-right text-sm"
          />
          <span className="text-xs text-[var(--text-muted)]">min</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void save()}
            disabled={saving}
          >
            Save
          </Button>
        </div>
      </div>
      <div
        className="mt-4 h-1.5 bg-[var(--surface-control)]"
        aria-label={`${Math.round(progress)} percent of weekly focus target`}
      >
        <div
          className="h-full bg-[var(--text-primary)] transition-[width] motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Target: {formatMinutes(target.target.targetMinutes)} this week
      </p>
    </section>
  );
}
