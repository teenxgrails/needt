"use client";

import * as React from "react";

import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-is-mobile";

export type NeedtPickerMode = "plain" | "searchable" | "creatable";

export interface NeedtPickerOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

export interface NeedtPickerProps {
  options: NeedtPickerOption[];
  mode?: NeedtPickerMode;
  value?: string;
  defaultValue?: string;
  valueLabel?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onTriggerClick?: React.MouseEventHandler<HTMLButtonElement>;
  onCreate?: (value: string) => void;
  createLabel?: (input: string) => string;
  label?: string;
  icon?: React.ReactNode;
  indented?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  ariaLabel?: string;
  triggerId?: string;
  testId?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  showChevron?: boolean;
  triggerVariant?: "inline" | "field";
}

/**
 * The only product picker in Needt. It owns plain, searchable and creatable
 * single-select behavior and automatically becomes a safe-area bottom sheet
 * on phones.
 */
export function NeedtPicker({
  options,
  mode: requestedMode,
  value,
  defaultValue,
  valueLabel,
  onValueChange,
  onOpenChange,
  onTriggerClick,
  onCreate,
  createLabel,
  label,
  icon,
  indented = false,
  placeholder = "Choose…",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  header,
  footer,
  ariaLabel,
  triggerId,
  testId,
  disabled,
  className,
  contentClassName,
  align = "start",
  showChevron,
  triggerVariant,
}: NeedtPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? ""
  );
  const listboxId = React.useId();
  const isMobile = useIsMobile(640);
  const currentValue = value ?? uncontrolledValue;
  const mode =
    requestedMode ??
    (onCreate
      ? "creatable"
      : searchPlaceholder !== "Search…"
        ? "searchable"
        : "plain");
  const variant = triggerVariant ?? (label ? "inline" : "field");
  const selected = options.find((option) => option.value === currentValue);
  const displayValue =
    valueLabel !== undefined
      ? valueLabel
      : (selected?.label ?? (currentValue || placeholder));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions =
    mode === "plain" || !normalizedQuery
      ? options
      : options.filter((option) =>
          [option.label, option.value, ...(option.keywords ?? [])].some(
            (candidate) => candidate.toLowerCase().includes(normalizedQuery)
          )
        );
  const canCreate =
    mode === "creatable" &&
    query.trim().length > 0 &&
    !options.some(
      (option) =>
        option.label.toLowerCase() === query.trim().toLowerCase() ||
        option.value.toLowerCase() === query.trim().toLowerCase()
    );

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    onOpenChange?.(false);
  }, [onOpenChange]);

  const openPicker = () => {
    setOpen(true);
    onOpenChange?.(true);
  };

  const commit = (nextValue: string) => {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
    close();
  };

  const create = () => {
    const nextValue = query.trim();
    if (!nextValue) return;
    onCreate?.(nextValue);
    if (!onCreate) commit(nextValue);
    else close();
  };

  const optionList = (
    <Command className="bg-transparent" loop shouldFilter={false}>
      {(mode === "searchable" || mode === "creatable") && (
        <div className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--popover-bg)] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <Command.Input
              autoFocus={!isMobile}
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-input)] pl-9 pr-3 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      )}
      <Command.List className="max-h-[min(360px,55dvh)] overflow-y-auto p-1.5">
        {visibleOptions.map((option) => (
          <Command.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            onSelect={() => commit(option.value)}
            className={cn(
              "needt-motion-menu-item flex min-h-10 w-full cursor-pointer select-none items-center gap-3 rounded-[7px] px-3 py-2 text-left text-[14px] text-[var(--text-primary)] outline-none transition-colors aria-selected:bg-[var(--menu-item-hover)] data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40",
              option.value === currentValue &&
                "bg-[var(--text-primary)] text-[var(--surface-canvas)] aria-selected:bg-[var(--text-primary)] [&_.picker-muted]:text-[color:inherit]"
            )}
          >
            {option.icon}
            <span className="min-w-0 flex-1">
              <span className="block truncate">{option.label}</span>
              {option.description && (
                <span className="picker-muted mt-0.5 block truncate text-[12px] text-[var(--text-secondary)]">
                  {option.description}
                </span>
              )}
            </span>
            {option.trailing}
            {option.value === currentValue && (
              <Check className="h-4 w-4 flex-none text-current" />
            )}
          </Command.Item>
        ))}
        {canCreate && (
          <Command.Item
            value="__needt_create__"
            onSelect={create}
            className="needt-motion-menu-item flex min-h-10 cursor-pointer select-none items-center rounded-[7px] px-3 text-[14px] text-[var(--text-primary)] outline-none aria-selected:bg-[var(--menu-item-hover)]"
          >
            {createLabel?.(query.trim()) ?? `Use "${query.trim()}"`}
          </Command.Item>
        )}
        {visibleOptions.length === 0 && !canCreate && (
          <Command.Empty className="px-3 py-8 text-center text-[13px] text-[var(--text-secondary)]">
            {emptyLabel}
          </Command.Empty>
        )}
      </Command.List>
      {footer && (
        <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--popover-bg)] p-1.5">
          {footer}
        </div>
      )}
    </Command>
  );

  const trigger = (
    <button
      id={triggerId}
      data-testid={testId}
      type="button"
      role="combobox"
      aria-label={ariaLabel ?? label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      disabled={disabled}
      onClick={onTriggerClick}
      className={cn(
        "needt-motion-control inline-flex items-center gap-2 text-left text-[var(--text-primary)] outline-none transition-colors focus-visible:border-[var(--border-control)] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "inline"
          ? "ml-2 min-h-7 rounded-[var(--control-radius)] border border-transparent px-1.5 hover:border-[var(--border-control)] hover:bg-[var(--surface-hover)]"
          : "h-[var(--control-height)] w-full justify-between rounded-[var(--control-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium hover:border-[var(--control-border)] hover:bg-[var(--control-bg)]",
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon ?? selected?.icon}
        <span className="truncate">{displayValue}</span>
      </span>
      {(showChevron ?? variant === "field") && (
        <ChevronDown className="h-4 w-4 flex-none text-[var(--text-secondary)]" />
      )}
    </button>
  );

  const picker = isMobile ? (
    <BottomSheet
      open={open}
      onOpenChange={(next) => (next ? openPicker() : close())}
    >
      <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
      <BottomSheetContent className="overflow-hidden p-0">
        <div className="px-4 pb-3">
          <BottomSheetTitle>
            {label ?? ariaLabel ?? placeholder}
          </BottomSheetTitle>
          <BottomSheetDescription>
            Choose a value from the available options.
          </BottomSheetDescription>
        </div>
        <div id={listboxId} role="listbox">
          {optionList}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  ) : (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? openPicker() : close())}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        id={listboxId}
        role="listbox"
        className={cn(
          "w-[320px] overflow-hidden border-[var(--popover-border)] bg-[var(--popover-bg)] p-0 text-[var(--text-primary)] needt-overlay-shadow",
          contentClassName
        )}
      >
        {header && (
          <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[13px] font-semibold">
            {header}
          </div>
        )}
        {optionList}
      </PopoverContent>
    </Popover>
  );

  if (!label) return picker;

  return (
    <div
      className={cn(
        "relative flex min-h-[34px] items-center text-[14px]",
        indented &&
          "ml-1 pl-4 before:absolute before:left-1 before:top-0 before:h-4 before:w-3 before:rounded-bl-md before:border-b before:border-l before:border-[var(--border-subtle)]"
      )}
    >
      <span className="text-[var(--text-secondary)]">{label}:</span>
      {picker}
    </div>
  );
}
