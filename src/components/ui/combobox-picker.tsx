"use client";

import * as React from "react";

import { Command } from "cmdk";
import { ChevronDown } from "lucide-react";

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

export interface ComboboxPickerOption {
  value: string;
  label: string;
  /** Optional leading icon rendered in the trigger and the menu item. */
  icon?: React.ReactNode;
}

export interface ComboboxPickerProps {
  options: ComboboxPickerOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Trigger placeholder when nothing is selected. */
  placeholder?: string;
  /** Header search-input placeholder, e.g. "Choose project…". */
  searchPlaceholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /**
   * Allow typing a value that isn't in the list and committing it (Motion's
   * "Choose or type a duration" pattern). The typed string is passed to
   * `onCreate` if provided, otherwise to `onChange`.
   */
  creatable?: boolean;
  onCreate?: (value: string) => void;
  /** Label for the create row; defaults to `Use "<input>"`. */
  createLabel?: (input: string) => string;
  emptyLabel?: string;
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  showChevron?: boolean;
}

/**
 * Searchable (and optionally creatable) single-select picker built on cmdk.
 * The plain, non-searchable variant lives in `OptionPicker` (Radix Select);
 * reach for this when the list is long enough to filter or the user may type a
 * custom value. Shares the Motion header + checked-item + token styling.
 */
export function ComboboxPicker({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  ariaLabel,
  disabled,
  creatable = false,
  onCreate,
  createLabel,
  emptyLabel = "No results",
  className,
  contentClassName,
  align = "start",
  showChevron = true,
}: ComboboxPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const isMobile = useIsMobile(640);

  const selected = options.find((option) => option.value === value);

  const commit = (next: string) => {
    onChange?.(next);
    setOpen(false);
    setQuery("");
  };

  const create = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (onCreate) onCreate(trimmed);
    else onChange?.(trimmed);
    setOpen(false);
    setQuery("");
  };

  const trimmedQuery = query.trim();
  const showCreate =
    creatable &&
    trimmedQuery.length > 0 &&
    !options.some(
      (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase()
    );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "needt-motion-control flex h-[var(--control-height)] w-full items-center justify-between gap-2 whitespace-nowrap rounded-[var(--control-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--control-border)] hover:bg-[var(--control-bg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--control-border)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:flex-none",
          !selected && !value && "font-normal text-[var(--text-secondary)]"
        )}
      >
        {selected?.icon}
        <span className="truncate">
          {selected?.label ?? (value || placeholder)}
        </span>
      </span>
      {showChevron && (
        <ChevronDown className="h-4 w-4 flex-none text-[var(--control-fg-muted)]" />
      )}
    </button>
  );

  const picker = (
    <Command
      loop
      filter={(itemValue, search) =>
        itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
      }
      className="bg-transparent"
    >
      <div className={cn("border-b border-[var(--menu-border)]", isMobile ? "h-12" : "h-[29px]")}>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={cn(
            "w-full !border-0 bg-transparent px-2 text-[14px] leading-5 text-[var(--text-primary)] !shadow-none outline-none !ring-0 placeholder:text-[var(--text-muted)] focus:!border-0 focus:!shadow-none focus:!ring-0 focus-visible:!border-0 focus-visible:!ring-0",
            isMobile ? "h-11" : "h-7"
          )}
        />
      </div>
      <Command.List className={cn("overflow-y-auto p-0", isMobile ? "max-h-[55dvh]" : "max-h-[280px]")}>
        {!showCreate && (
          <Command.Empty className="px-3 py-4 text-center text-[13px] text-[var(--text-muted)]">
            {emptyLabel}
          </Command.Empty>
        )}
        {options.map((option) => (
          <Command.Item
            key={option.value}
            value={option.label}
            onSelect={() => commit(option.value)}
            className={cn(
              "needt-motion-menu-item relative flex cursor-pointer select-none items-center gap-2 rounded-[6px] px-3 text-[14px] leading-[18px] text-[var(--text-primary)] outline-none aria-selected:bg-[var(--menu-item-hover)] [&>svg]:h-4 [&>svg]:w-4 [&>svg]:flex-none",
              isMobile ? "min-h-12" : "h-8 min-w-[180px]",
              option.value === value &&
                "bg-[var(--text-primary)] text-[var(--surface-canvas)] aria-selected:bg-[var(--text-primary)]"
            )}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </Command.Item>
        ))}
        {showCreate && (
          <Command.Item
            key="__create__"
            value={`__create__${trimmedQuery}`}
            onSelect={() => create(trimmedQuery)}
            className={cn(
              "needt-motion-menu-item flex cursor-pointer select-none items-center gap-2 rounded-[6px] px-3 text-[14px] text-[var(--text-primary)] outline-none aria-selected:bg-[var(--menu-item-hover)]",
              isMobile ? "min-h-12" : "h-8 min-w-[180px]"
            )}
          >
            {createLabel ? createLabel(trimmedQuery) : `Use "${trimmedQuery}"`}
          </Command.Item>
        )}
      </Command.List>
    </Command>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={handleOpenChange}>
        <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
        <BottomSheetContent className="p-0">
          <BottomSheetTitle className="sr-only">
            {ariaLabel ?? placeholder}
          </BottomSheetTitle>
          <BottomSheetDescription className="sr-only">
            Search and choose an option.
          </BottomSheetDescription>
          {picker}
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className={cn(
          "w-auto min-w-[182px] max-w-[min(22rem,var(--radix-popover-content-available-width))] overflow-hidden p-0",
          contentClassName
        )}
      >
        {picker}
      </PopoverContent>
    </Popover>
  );
}
