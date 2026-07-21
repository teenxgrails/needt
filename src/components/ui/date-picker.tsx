"use client";

import { useMemo, useState } from "react";

import { CalendarDays, X } from "lucide-react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { addDays, format, newDate, startOfWeek } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-is-mobile";

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  includeTime?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  accent?: boolean;
  showIcon?: boolean;
  labelFormat?: string;
}

interface Shortcut {
  label: string;
  date: Date;
}

function withExistingTime(date: Date, value?: Date | null): Date {
  const next = new Date(date);
  const source = value ?? newDate();
  next.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return next;
}

function shortcutDates(): Shortcut[] {
  const today = newDate();
  const nextWeek = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
  const inTwoWeeks = startOfWeek(addDays(today, 14), { weekStartsOn: 1 });
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "Next week", date: nextWeek },
    { label: "In 2 weeks", date: inTwoWeeks },
    { label: "Next month", date: nextMonth },
  ];
}

export function DatePicker({
  value,
  onChange,
  includeTime = false,
  placeholder = "Choose date",
  ariaLabel = "Choose date",
  className,
  accent = false,
  showIcon = true,
  labelFormat,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile(640);

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "group flex min-w-0 items-center gap-1.5 rounded-md text-left transition-colors duration-150 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--control-border)]",
        isMobile ? "min-h-11 px-3 text-[16px]" : "min-h-7 px-1.5 text-[13px]",
        accent ? "text-[var(--color-accent)]" : "text-[var(--text-primary)]",
        !value && "text-[var(--text-muted)]",
        className
      )}
    >
      {showIcon && (
        <CalendarDays className="h-3.5 w-3.5 flex-none opacity-70" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {value
          ? format(
              value,
              labelFormat ?? (includeTime ? "EEE MMM d, h:mm a" : "EEE MMM d")
            )
          : placeholder}
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={setOpen}>
        <div onClick={() => setOpen(true)}>{trigger}</div>
        <BottomSheetContent className="max-h-[88dvh] p-0">
          <BottomSheetTitle className="sr-only">{ariaLabel}</BottomSheetTitle>
          <BottomSheetDescription className="sr-only">
            Pick a date or choose a shortcut.
          </BottomSheetDescription>
          <DatePickerPanel
            value={value}
            includeTime={includeTime}
            onChange={onChange}
            onDone={() => setOpen(false)}
            mobile
          />
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[443px] overflow-hidden p-0"
      >
        <DatePickerPanel
          value={value}
          includeTime={includeTime}
          onChange={onChange}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function DatePickerPanel({
  value,
  includeTime,
  onChange,
  onDone,
  mobile = false,
}: {
  value?: Date | null;
  includeTime: boolean;
  onChange: (date: Date | null) => void;
  onDone: () => void;
  mobile?: boolean;
}) {
  const shortcuts = useMemo(shortcutDates, []);
  const selectDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(withExistingTime(date, value));
    if (!includeTime) onDone();
  };

  return (
    <div
      className={cn(
        "grid bg-[var(--popover-bg)]",
        mobile ? "grid-cols-1" : "grid-cols-[262px_181px]"
      )}
    >
      <div className="min-w-0">
        <div className="flex h-11 items-center gap-2 border-b border-[var(--border-subtle)] px-3 text-[13px]">
          <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="font-medium text-[var(--text-primary)]">
            {value ? format(value, "EEE MMM d") : "Choose a date"}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={cn(
                "ml-auto grid place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                mobile ? "h-11 w-11" : "h-7 w-7"
              )}
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          onSelect={selectDate}
          weekStartsOn={1}
          className="mx-auto w-[262px] p-3"
        />
        {includeTime && (
          <div className="flex h-12 items-center gap-3 border-t border-[var(--border-subtle)] px-3">
            <span className="text-[12px] text-[var(--text-secondary)]">
              Time
            </span>
            <input
              type="time"
              value={value ? format(value, "HH:mm") : ""}
              onChange={(event) => {
                if (!event.target.value) return;
                const [hours, minutes] = event.target.value
                  .split(":")
                  .map(Number);
                const next = value ? new Date(value) : newDate();
                next.setHours(hours, minutes, 0, 0);
                onChange(next);
              }}
              className={cn(
                "ml-auto rounded-md border border-[var(--control-border)] bg-[var(--surface-input)] px-2 text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]",
                mobile ? "h-11 text-[16px]" : "h-8 text-[13px]"
              )}
            />
            <button
              type="button"
              onClick={onDone}
              className={cn(
                "rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-3 font-medium text-[var(--button-primary-fg)] shadow-[var(--button-primary-shadow)] hover:bg-[var(--button-primary-bg-hover)]",
                mobile ? "h-11 text-[14px]" : "h-8 text-[12px]"
              )}
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "border-[var(--border-subtle)] p-2",
          mobile ? "grid grid-cols-2 border-t" : "border-l pt-[52px]"
        )}
      >
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => {
              onChange(withExistingTime(shortcut.date, value));
              if (!includeTime) onDone();
            }}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-2.5 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--surface-hover)]",
              mobile ? "min-h-12 last:col-span-2" : "min-h-10"
            )}
          >
            <span className="font-medium text-[var(--text-primary)]">
              {shortcut.label}
            </span>
            <span className="text-[var(--text-muted)]">
              {format(shortcut.date, "EEE MMM d")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
