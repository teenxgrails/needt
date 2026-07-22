"use client";

import { formatClock } from "@/lib/focus-timer";

import { useFocusTimer } from "@/hooks/use-focus-timer";

/**
 * Live focus timer shown on the sidebar Focus item. Isolated into its own
 * component so the 1s tick only re-renders this badge, not the whole nav.
 * Renders nothing when no session is active.
 */
export function FocusNavBadge({ collapsed = false }: { collapsed?: boolean }) {
  const { isActive, isPaused, remainingSeconds, elapsedSeconds, session } =
    useFocusTimer();

  if (!isActive) return null;

  const seconds =
    session?.plannedMinutes == null ? elapsedSeconds : (remainingSeconds ?? 0);

  return (
    <span
      className={cnBadge(isPaused)}
      title={isPaused ? "Focus paused" : "Focus running"}
      aria-label={`Focus ${isPaused ? "paused" : "running"} ${formatClock(seconds)}`}
    >
      {collapsed ? "●" : formatClock(seconds)}
    </span>
  );
}

function cnBadge(paused: boolean): string {
  return [
    "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white max-lg:hidden",
    paused
      ? "bg-[var(--surface-control)] text-[var(--text-secondary)]"
      : "bg-[var(--color-accent)]",
  ].join(" ");
}
