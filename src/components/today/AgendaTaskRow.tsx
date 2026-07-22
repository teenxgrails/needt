"use client";

import { useState } from "react";

import { Check } from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { newDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { Task, TaskStatus } from "@/types/task";

const DURATION_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "Reminder", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
];

function taskDisplayDate(task: Task) {
  const value = task.dueDate ?? task.scheduledStart ?? task.startDate;
  return value ? newDate(value) : null;
}

function durationValue(task: Task) {
  return task.duration ?? task.estimatedMinutes ?? null;
}

function durationLabel(minutes: number | null) {
  if (!minutes) return "Reminder";
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function parseDuration(value: string): number | null | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "reminder") return null;
  const hours = normalized.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
  if (hours) return Math.max(1, Math.round(Number(hours[1]) * 60));
  const minutes = normalized.match(/^(\d+)\s*m?(?:in(?:utes?)?)?$/);
  if (minutes) return Math.max(1, Number(minutes[1]));
  return undefined;
}

export function AgendaTaskRow({
  task,
  overdue = false,
  onOpen,
  onComplete,
  onDateChange,
  onDurationChange,
}: {
  task: Task;
  overdue?: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onDateChange: (date: Date | null) => void;
  onDurationChange: (duration: number | null) => void;
}) {
  const completed = task.status === TaskStatus.COMPLETED;
  const date = taskDisplayDate(task);

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg py-0.5 transition-colors hover:bg-[var(--surface-hover)] sm:flex-nowrap sm:px-1">
      <button
        type="button"
        onClick={onComplete}
        aria-label={
          completed ? `Reopen ${task.title}` : `Complete ${task.title}`
        }
        className="group/complete grid h-11 w-10 flex-none place-items-center rounded-full text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
      >
        <span
          aria-hidden
          className={cn(
            "grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] border-[var(--text-muted)] transition-[border-color,background-color,color] duration-150 group-hover/complete:border-[var(--color-success)] group-hover/complete:text-[var(--color-success)] motion-reduce:transition-none",
            completed &&
              "border-[var(--color-success)] bg-[var(--color-success)] text-[var(--surface-canvas)]"
          )}
        >
          <Check
            className={cn(
              "h-3.5 w-3.5 opacity-0 transition-opacity duration-150 group-hover/complete:opacity-100 motion-reduce:transition-none",
              completed && "opacity-100"
            )}
            strokeWidth={2.5}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "inline-flex min-h-11 min-w-0 max-w-full items-center text-left text-[17px] leading-8 text-[var(--text-primary)] underline decoration-[var(--border-control)] underline-offset-4 hover:decoration-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)] sm:min-h-8 xl:text-[18px]",
          completed && "text-[var(--text-muted)] line-through"
        )}
      >
        {task.title}
      </button>

      <DatePicker
        value={date}
        onChange={onDateChange}
        includeTime
        showIcon={false}
        labelFormat="EEE M/d"
        ariaLabel={`Change date for ${task.title}`}
        placeholder="Set date"
        accent={!completed}
        className={cn(
          "min-h-11 px-1 text-[15px] sm:min-h-9 xl:text-[16px]",
          overdue && "text-[var(--color-danger)]",
          completed && "text-[var(--text-muted)]"
        )}
      />

      <DurationPicker
        value={durationValue(task)}
        disabled={completed}
        onChange={onDurationChange}
      />
    </div>
  );
}

function DurationPicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (duration: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const applyCustom = () => {
    const parsed = parseDuration(custom);
    if (parsed === undefined) return;
    onChange(parsed);
    setOpen(false);
    setCustom("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="min-h-11 rounded-md px-1 text-[15px] tabular-nums text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)] disabled:pointer-events-none sm:min-h-9 xl:text-[16px]"
        >
          {durationLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 overflow-hidden p-0">
        <div className="border-b border-[var(--border-subtle)] p-2">
          <input
            autoFocus
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyCustom();
            }}
            placeholder="Choose or type a duration"
            aria-label="Custom task duration"
            className="h-9 w-full bg-transparent px-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--menu-item-hover)]"
            >
              {option.label}
              {value === option.value && (
                <Check className="h-4 w-4 text-[var(--color-accent)]" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
