"use client";

import { useMemo, useState } from "react";

import { Check, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

export interface NeedtPickerOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function NeedtPicker({
  label,
  value,
  valueLabel,
  options,
  onValueChange,
  icon,
  indented = false,
  placeholder = "Choose…",
  searchPlaceholder,
  footer,
}: {
  label: string;
  value: string;
  valueLabel?: string;
  options: NeedtPickerOption[];
  onValueChange: (value: string) => void;
  icon?: React.ReactNode;
  indented?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized)
    );
  }, [options, query]);

  return (
    <div
      className={cn(
        "relative flex min-h-[34px] items-center text-[14px]",
        indented &&
          "ml-1 pl-4 before:absolute before:left-1 before:top-0 before:h-4 before:w-3 before:rounded-bl-md before:border-b before:border-l before:border-[var(--border-subtle)]"
      )}
    >
      <span className="text-[var(--text-secondary)]">{label}:</span>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ml-2 inline-flex min-h-7 items-center gap-2 rounded-[var(--control-radius)] border border-transparent px-1.5 text-left text-[var(--text-primary)] transition-colors hover:border-[var(--border-control)] hover:bg-[var(--surface-hover)]"
          >
            {icon}
            <span>{valueLabel || placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[360px] overflow-hidden bg-[var(--popover-bg)] p-0 text-[var(--text-primary)]"
        >
          {searchPlaceholder && (
            <div className="border-b border-[var(--border-subtle)] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-9"
                />
              </div>
            </div>
          )}
          <div className="max-h-[360px] overflow-y-auto p-1">
            {visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-[var(--control-radius)] px-3 py-2 text-left text-[14px] transition-colors hover:bg-[var(--menu-item-hover)]",
                  option.value === value && "bg-[var(--menu-item-hover)]"
                )}
              >
                {option.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description && (
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--text-secondary)]">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.trailing}
                {option.value === value && (
                  <Check className="h-4 w-4 text-[var(--color-accent)]" />
                )}
              </button>
            ))}
            {visibleOptions.length === 0 && (
              <div className="px-3 py-8 text-center text-[13px] text-[var(--text-secondary)]">
                No matches
              </div>
            )}
          </div>
          {footer && (
            <div className="border-t border-[var(--border-subtle)] p-1">
              {footer}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** @deprecated Import NeedtPicker for all product pickers. */
export const MotionPicker = NeedtPicker;
/** @deprecated Use NeedtPickerOption. */
export type MotionPickerOption = NeedtPickerOption;

export function MotionSwitchRow({
  label,
  checked,
  onCheckedChange,
  icon,
  indented = false,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  indented?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[34px] items-center gap-2 text-[14px]",
        indented &&
          "ml-1 pl-4 before:absolute before:left-1 before:top-0 before:h-4 before:w-3 before:rounded-bl-md before:border-b before:border-l before:border-[var(--border-subtle)]"
      )}
    >
      <span className="text-[var(--text-secondary)]">{label}:</span>
      {icon}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="h-[18px] w-[32px] [&>span]:h-3.5 [&>span]:w-3.5 [&>span]:data-[state=checked]:translate-x-3.5"
      />
    </div>
  );
}

export function MotionRadioOption({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-8 items-center gap-2 text-left text-[14px] text-[var(--text-primary)]"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--border-control)]",
          checked &&
            "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={2.6} />}
      </span>
      <span>{children}</span>
    </button>
  );
}
