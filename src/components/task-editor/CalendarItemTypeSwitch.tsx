import { CalendarDays, CheckSquare2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalendarItemType = "task" | "event";

interface CalendarItemTypeSwitchProps {
  value: CalendarItemType;
  onValueChange?: (value: CalendarItemType) => void;
  locked?: boolean;
}

/**
 * The one thing people get wrong about this product: a task is something the
 * scheduler may move, an event is something that happens at a fixed time. This
 * switch decides the whole shape of the form, so it states the difference on
 * hover instead of leaving it to be discovered.
 */
const TYPE_HINT: Record<CalendarItemType, string> = {
  task: "Task — the planner can move it to fit your work hours.",
  event: "Event — stays exactly where you put it.",
};

export function CalendarItemTypeSwitch({
  value,
  onValueChange,
  locked = false,
}: CalendarItemTypeSwitchProps) {
  if (locked) {
    return (
      <span
        title={TYPE_HINT[value]}
        className="flex items-center gap-2 text-[13px] font-normal text-[var(--text-muted)]"
      >
        {value === "task" ? (
          <CheckSquare2 className="h-4 w-4" />
        ) : (
          <CalendarDays className="h-4 w-4" />
        )}
        {value === "task" ? "Task" : "Event"}
      </span>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Calendar item type"
      className="inline-flex h-8 items-center rounded-md border border-[var(--control-border)] bg-[var(--control-bg)] p-0.5"
    >
      {(["task", "event"] as const).map((type) => {
        const selected = type === value;
        const Icon = type === "task" ? CheckSquare2 : CalendarDays;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={selected}
            title={TYPE_HINT[type]}
            onClick={() => onValueChange?.(type)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] transition-[background-color,color,border-color] duration-150",
              // The selected half sits on the raised surface with a hairline of
              // its own. It used to use --surface-selected, which in the light
              // theme is nearly the same tone as the track beneath it, so
              // neither half looked chosen.
              selected
                ? "border border-[var(--border-control)] bg-[var(--surface-raised)] font-semibold text-[var(--text-primary)]"
                : "border border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {type === "task" ? "Task" : "Event"}
          </button>
        );
      })}
    </div>
  );
}
