"use client";

import { useMemo, useState } from "react";

import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  COMMON_TIME_ZONES,
  getTimeZoneDisplayName,
  getTimeZoneLabel,
} from "@/lib/time-zones";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";

export function CalendarTimeZoneControl() {
  const { user, updateUserSettings } = useSettingsStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const primaryLabel = getTimeZoneLabel(user.timeZone);
  const secondaryLabel = user.secondaryTimeZone
    ? getTimeZoneLabel(user.secondaryTimeZone)
    : null;
  const zones = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return COMMON_TIME_ZONES.filter(
      (zone) =>
        zone !== user.timeZone &&
        (!needle || getTimeZoneDisplayName(zone).toLowerCase().includes(needle))
    );
  }, [query, user.timeZone]);

  const selectZone = (timeZone: string) => {
    updateUserSettings({ secondaryTimeZone: timeZone });
    setQuery("");
    setPickerOpen(false);
    setMenuOpen(false);
  };

  const picker = (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add secondary timezone"
          className="grid h-7 w-7 place-items-center rounded-md border border-transparent text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--control-border)] hover:bg-[var(--control-bg)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[340px] max-w-[calc(100vw-1rem)] p-1.5"
      >
        <div className="relative mb-1.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search location or time zone"
            className="h-9 border-[var(--control-border)] bg-[var(--control-bg)] pl-8 text-[13px]"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {zones.map((zone) => {
            const selected = zone === user.secondaryTimeZone;
            return (
              <button
                key={zone}
                type="button"
                onClick={() => selectZone(zone)}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--menu-item-hover)]",
                  selected && "bg-[var(--surface-selected)]"
                )}
              >
                <span className="w-12 font-semibold text-[var(--text-primary)]">
                  {getTimeZoneLabel(zone)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                  {getTimeZoneDisplayName(zone)}
                </span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="absolute left-1 top-2 z-[8] flex h-7 items-center gap-0.5 text-[12px] font-medium">
      <span className="pl-1.5 text-[var(--text-secondary)]">
        {primaryLabel}
      </span>
      {user.secondaryTimeZone && secondaryLabel ? (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-1 flex h-7 items-center rounded-md border border-[var(--control-border)] bg-[var(--control-bg)] px-2 font-semibold text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--control-bg-hover)] hover:text-[var(--text-primary)]"
              aria-label={`Secondary timezone ${secondaryLabel}`}
            >
              {secondaryLabel}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1.5">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPickerOpen(true);
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-[13px] hover:bg-[var(--menu-item-hover)]"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                updateUserSettings({ secondaryTimeZone: null });
                setMenuOpen(false);
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-[13px] text-[var(--color-danger)] hover:bg-[var(--menu-item-hover)]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        picker
      )}
      {user.secondaryTimeZone && (
        <div className="pointer-events-none absolute left-0 top-0 opacity-0">
          {picker}
        </div>
      )}
    </div>
  );
}
