"use client";

import { useEffect, useMemo, useState } from "react";

import { Check, ChevronDown, Pencil, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { APP_NAME } from "@/lib/app-config";
import {
  parseSelectedCalendars,
  stringifySelectedCalendars,
} from "@/lib/autoSchedule";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { SettingsSection } from "./SettingsSection";

type PickerMode = "my-calendars" | "conflicts" | null;
const LEGACY_LOCAL_CALENDAR_NAME = "flowday";

function displayCalendarName(name: string, type: string) {
  return type === "LOCAL" || name.toLowerCase() === LEGACY_LOCAL_CALENDAR_NAME
    ? APP_NAME
    : name;
}

export function CalendarSettings() {
  const {
    accounts,
    autoSchedule,
    calendar,
    updateAutoScheduleSettings,
    updateCalendarSettings,
  } = useSettingsStore();
  const { feeds, loadFromDatabase, toggleFeed } = useCalendarStore();
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [defaultCalendarId, setDefaultCalendarId] = useState("");
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadFromDatabase();
  }, [loadFromDatabase]);

  const openPicker = (mode: Exclude<PickerMode, null>) => {
    setPickerMode(mode);
    setQuery("");
    setDefaultCalendarId(calendar.defaultCalendarId || "");
    setSelection(
      new Set(
        mode === "my-calendars"
          ? feeds.filter((feed) => feed.enabled).map((feed) => feed.id)
          : parseSelectedCalendars(autoSchedule.selectedCalendars)
      )
    );
  };

  const visibleFeeds = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return feeds;
    return feeds.filter((feed) => feed.name.toLowerCase().includes(normalized));
  }, [feeds, query]);

  const groupedFeeds = useMemo(() => {
    const accountGroups = accounts
      .map((account) => ({
        account: { id: account.id, email: account.email },
        feeds: visibleFeeds.filter((feed) => feed.accountId === account.id),
      }))
      .filter((group) => group.feeds.length > 0);
    const accountIds = new Set(accounts.map((account) => account.id));
    const localFeeds = visibleFeeds.filter(
      (feed) => !feed.accountId || !accountIds.has(feed.accountId)
    );
    return localFeeds.length > 0
      ? [
          ...accountGroups,
          { account: { id: "needt", email: APP_NAME }, feeds: localFeeds },
        ]
      : accountGroups;
  }, [accounts, visibleFeeds]);

  const savePicker = async () => {
    if (!pickerMode) return;
    setIsSaving(true);
    try {
      if (pickerMode === "my-calendars") {
        await Promise.all(
          feeds
            .filter((feed) => feed.enabled !== selection.has(feed.id))
            .map((feed) => toggleFeed(feed.id))
        );
        updateCalendarSettings({ defaultCalendarId });
      } else {
        updateAutoScheduleSettings({
          selectedCalendars: stringifySelectedCalendars([...selection]),
        });
      }
      setPickerMode(null);
    } finally {
      setIsSaving(false);
    }
  };

  const enabledFeeds = feeds.filter((feed) => feed.enabled);

  return (
    <>
      <SettingsSection title="Calendar Grouping">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold">My Calendars</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPicker("my-calendars")}
            className="h-7 px-2.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="mt-3 overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          {enabledFeeds.length === 0 ? (
            <div className="flex min-h-[52px] items-center px-4 text-[13px] text-[var(--text-secondary)]">
              Choose calendars to show in Needt.
            </div>
          ) : (
            enabledFeeds.map((feed) => (
              <div
                key={feed.id}
                className="flex min-h-[52px] items-center gap-3 border-t border-[var(--border-subtle)] px-4 first:border-t-0"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: feed.color || "var(--text-muted)" }}
                />
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {displayCalendarName(feed.name, feed.type)}
                </span>
                {calendar.defaultCalendarId === feed.id && (
                  <span className="rounded-full bg-[var(--surface-control)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
                    Main Calendar
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-7 flex items-center gap-2">
          <h3 className="text-[14px] font-semibold">Frequently met with</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPicker("conflicts")}
            className="h-7 px-2.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </SettingsSection>

      <Dialog
        open={Boolean(pickerMode)}
        onOpenChange={(open) => !open && setPickerMode(null)}
      >
        <DialogContent className="flex h-[min(650px,calc(100dvh-32px))] max-w-[600px] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-[var(--border-subtle)] p-5 pr-12">
            <DialogTitle>
              {pickerMode === "conflicts"
                ? "Edit Frequently Met With"
                : "Edit My Calendars"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose connected calendars for this group.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-[var(--border-subtle)] p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search calendars"
                className="h-10 pl-10"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mb-4 text-[15px] font-semibold">
              {pickerMode === "conflicts"
                ? "Frequently Met With"
                : "My Calendars"}
            </div>
            {groupedFeeds.map(({ account, feeds: accountFeeds }) => (
              <div
                key={account.id}
                className="border-t border-[var(--border-subtle)] py-3 first:border-t-0"
              >
                <div className="flex items-center gap-2 text-[14px]">
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  {account.email}
                </div>
                <div className="mt-2 space-y-1 pl-7">
                  {accountFeeds.map((feed) => (
                    <label
                      key={feed.id}
                      className="flex min-h-9 cursor-pointer items-center gap-3 rounded-[var(--control-radius)] px-2 hover:bg-[var(--surface-hover)]"
                    >
                      <Checkbox
                        checked={selection.has(feed.id)}
                        onCheckedChange={(checked) =>
                          setSelection((current) => {
                            const next = new Set(current);
                            if (checked) next.add(feed.id);
                            else next.delete(feed.id);
                            return next;
                          })
                        }
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            feed.color || "var(--text-secondary)",
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[14px]">
                        {displayCalendarName(feed.name, feed.type)}
                      </span>
                      {pickerMode === "my-calendars" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDefaultCalendarId(feed.id);
                            setSelection((current) =>
                              new Set(current).add(feed.id)
                            );
                          }}
                          className="flex h-7 items-center gap-1.5 rounded-full bg-[var(--surface-control)] px-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          {defaultCalendarId === feed.id && (
                            <Check className="h-3 w-3" />
                          )}
                          Main
                        </button>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {groupedFeeds.length === 0 && (
              <div className="py-12 text-center text-[13px] text-[var(--text-secondary)]">
                No connected calendars found.
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-[var(--border-subtle)] p-4">
            <Button variant="outline" onClick={() => setPickerMode(null)}>
              Cancel
            </Button>
            <Button onClick={savePicker} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
