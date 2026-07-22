import { CalendarDays, CheckSquare2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type CalendarItemType = "task" | "event";

interface CalendarItemTypeSwitchProps {
  value: CalendarItemType;
  onValueChange?: (value: CalendarItemType) => void;
  locked?: boolean;
}

export function CalendarItemTypeSwitch({
  value,
  onValueChange,
  locked = false,
}: CalendarItemTypeSwitchProps) {
  if (locked) {
    return (
      <span className="flex items-center gap-2 text-[13px] font-normal text-[var(--text-muted)]">
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
            onClick={() => onValueChange?.(type)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-[background-color,color] duration-150",
              selected
                ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
