"use client";

import { useEffect, useRef, useState } from "react";

import * as AlertDialog from "@radix-ui/react-alert-dialog";

import { CalendarItemTypeSwitch } from "@/components/calendar/CalendarItemTypeSwitch";
import {
  CALENDAR_EDITOR_ASIDE_FOOTER_CLASS,
  CALENDAR_EDITOR_CONTENT_CLASS,
  CALENDAR_EDITOR_FORM_CLASS,
  CALENDAR_EDITOR_MAIN_FOOTER_CLASS,
} from "@/components/calendar/calendar-editor-shell";
import { TaskDescriptionEditor } from "@/components/tasks/TaskDescriptionEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { CalendarEvent, CalendarFeed } from "@/types/calendar";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Partial<CalendarEvent>;
  defaultDate?: Date;
  defaultEndDate?: Date;
  onItemTypeChange?: (type: "task" | "event") => void;
}

// Google Calendar recurrence rules
const FREQUENCIES = {
  NONE: "NONE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

type Frequency = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

// RRule weekday codes
const WEEKDAYS = {
  SU: "Sunday",
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
} as const;

// Helper function to parse recurrence rule
function parseRecurrenceRule(rule?: string) {
  if (!rule) return { freq: FREQUENCIES.NONE, interval: 1, byDay: [] };

  // Remove RRULE: prefix and any array wrapper
  rule = rule.replace(/^\[?"?RRULE:/i, "").replace(/"?\]?$/, "");

  const parts = rule.split(";");
  const result = {
    freq: FREQUENCIES.NONE as Frequency,
    interval: 1,
    byDay: [] as string[],
  };

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ":
        result.freq = value as Frequency;
        break;
      case "INTERVAL":
        result.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        result.byDay = value.split(",");
        break;
    }
  });

  return result;
}

// Helper function to build recurrence rule
function buildRecurrenceRule(freq: string, interval: number, byDay: string[]) {
  if (freq === FREQUENCIES.NONE) return "";

  const parts = [];

  // Add frequency
  if (Object.values(FREQUENCIES).includes(freq as Frequency)) {
    parts.push(`FREQ=${freq}`);
  }

  // Add interval if greater than 1
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  // Add BYDAY for weekly recurrence
  if (freq === FREQUENCIES.WEEKLY && byDay.length > 0) {
    // byDay should already be in RRule format (MO, TU, etc.)
    parts.push(`BYDAY=${byDay.join(",")}`);
  }

  return parts.join(";");
}

export function EventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
  defaultEndDate,
  onItemTypeChange,
}: EventModalProps) {
  const { feeds, addEvent, updateEvent, removeEvent } = useCalendarStore();
  const { calendar } = useSettingsStore();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const preserveDraftRef = useRef(false);
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "series">();
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startDate, setStartDate] = useState<Date>(
    event?.start
      ? newDate(event.start)
      : defaultDate
        ? newDate(defaultDate)
        : newDate()
  );
  const [endDate, setEndDate] = useState<Date>(
    event?.end
      ? newDate(event.end)
      : defaultEndDate
        ? newDate(defaultEndDate)
        : newDate(Date.now() + 3600000)
  );
  const [selectedFeedId, setSelectedFeedId] = useState<string>(
    event?.feedId || calendar.defaultCalendarId || ""
  );
  const [isAllDay, setIsAllDay] = useState(event?.allDay || false);
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring || false);
  const [recurrenceFreq, setRecurrenceFreq] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preserveDraftRef.current) {
        preserveDraftRef.current = false;
        return;
      }
      setTitle(event?.title || "");
      setDescription(event?.description || "");
      setLocation(event?.location || "");
      setStartDate(
        event?.start
          ? newDate(event.start)
          : defaultDate
            ? newDate(defaultDate)
            : newDate()
      );
      setEndDate(
        event?.end
          ? newDate(event.end)
          : defaultEndDate
            ? newDate(defaultEndDate)
            : newDate(Date.now() + 3600000)
      );
      setSelectedFeedId(event?.feedId || calendar.defaultCalendarId || "");
      setIsAllDay(event?.allDay || false);
      setIsRecurring(event?.isRecurring || false);
      const { freq, interval, byDay } = parseRecurrenceRule(
        event?.recurrenceRule
      );
      setRecurrenceFreq(freq || "");
      setRecurrenceInterval(interval);
      setRecurrenceByDay(byDay);
      setEditMode(undefined);
      setShowRecurrenceDialog(false);

      // Focus the title input
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [
    isOpen,
    event,
    defaultDate,
    defaultEndDate,
    feeds,
    calendar.defaultCalendarId,
  ]);

  // Show recurrence dialog when editing a recurring event
  useEffect(() => {
    if (isOpen && event?.isRecurring && !editMode && !showRecurrenceDialog) {
      //todo: we need to handle editing series vs single, for now forcing to always edit series
      // setShowRecurrenceDialog(true);
      setEditMode("series");
    }
  }, [isOpen, event?.isRecurring, editMode, showRecurrenceDialog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let feedId = selectedFeedId;
      let feed = feeds.find((candidate) => candidate.id === feedId);

      // A fresh personal planner has no external calendar yet. Motion still
      // lets the user create an event, so create Needt's private local
      // calendar on first use rather than blocking the editor.
      if (!feed && !event?.id) {
        const response = await fetch("/api/feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: APP_NAME,
            type: "LOCAL",
            color: "#6366F1",
            enabled: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ${APP_NAME} calendar`);
        }

        feed = (await response.json()) as CalendarFeed;
        feedId = feed.id;
        setSelectedFeedId(feedId);
        await useCalendarStore.getState().loadFromDatabase();
      }

      if (!feed) {
        throw new Error("Selected calendar not found");
      }

      const eventData: Omit<CalendarEvent, "id"> = {
        title,
        description,
        location,
        start: startDate,
        end: endDate,
        feedId,
        allDay: isAllDay,
        isRecurring,
        recurrenceRule: isRecurring
          ? buildRecurrenceRule(
              recurrenceFreq,
              recurrenceInterval,
              recurrenceByDay
            )
          : undefined,
        isMaster: false,
      };

      if (event?.id) {
        // For existing events
        if (feed.type === "GOOGLE" && !event.externalEventId) {
          throw new Error("Cannot edit this Google Calendar event");
        }
        await updateEvent(event.id, eventData, editMode);
      } else {
        // For new events
        await addEvent(eventData);
      }
      // Reset all states before closing
      resetState();
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      alert(error instanceof Error ? error.message : "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;

    try {
      setIsSubmitting(true);
      await removeEvent(event.id, editMode);
      resetState();
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to render recurrence options
  const renderRecurrenceOptions = () => {
    if (!isRecurring) return null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recurrence-freq">Repeats</Label>
          <Select
            value={recurrenceFreq || FREQUENCIES.WEEKLY}
            onValueChange={(value) =>
              setRecurrenceFreq(value === FREQUENCIES.NONE ? "" : value)
            }
          >
            <SelectTrigger id="recurrence-freq" data-testid="recurrence-freq">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FREQUENCIES.DAILY}>Daily</SelectItem>
              <SelectItem value={FREQUENCIES.WEEKLY}>Weekly</SelectItem>
              <SelectItem value={FREQUENCIES.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={FREQUENCIES.YEARLY}>Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recurrenceFreq && recurrenceFreq !== FREQUENCIES.NONE && (
          <>
            <div className="space-y-2">
              <Label htmlFor="recurrence-interval">Repeat every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  id="recurrence-interval"
                  min="1"
                  value={recurrenceInterval}
                  onChange={(e) =>
                    setRecurrenceInterval(
                      Math.max(1, parseInt(e.target.value, 10))
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {recurrenceFreq.toLowerCase()}
                  {recurrenceInterval > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {recurrenceFreq === FREQUENCIES.WEEKLY && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(WEEKDAYS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={recurrenceByDay.includes(key)}
                        onCheckedChange={(checked) => {
                          setRecurrenceByDay(
                            checked
                              ? [...recurrenceByDay, key]
                              : recurrenceByDay.filter((d) => d !== key)
                          );
                        }}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          data-testid="event-modal"
          className={CALENDAR_EDITOR_CONTENT_CLASS}
        >
          {isSubmitting && <LoadingOverlay />}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--border-control)] sm:hidden"
          />

          <form
            onSubmit={handleSubmit}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.requestSubmit();
              }
            }}
            className={CALENDAR_EDITOR_FORM_CLASS}
          >
            <DialogHeader className="space-y-0 px-6 py-4 lg:[grid-area:header] lg:px-10 lg:pt-4">
              <DialogDescription className="sr-only">
                Create or edit a fixed calendar event, its description, timing,
                recurrence, location, and calendar.
              </DialogDescription>
              <div className="flex min-h-10 items-center justify-between sm:h-[25px] sm:min-h-0">
                <DialogTitle asChild>
                  <div>
                    <CalendarItemTypeSwitch
                      value="event"
                      locked={Boolean(event?.id)}
                      onValueChange={(type) => {
                        preserveDraftRef.current = true;
                        onItemTypeChange?.(type);
                      }}
                    />
                  </div>
                </DialogTitle>
              </div>
              <Label htmlFor="title" className="sr-only">
                Event title
              </Label>
              <Input
                type="text"
                id="title"
                ref={titleInputRef}
                data-testid="event-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event name"
                className="mt-1 h-[42px] border-0 bg-transparent px-0 text-[22px] font-semibold text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:border-0 focus-visible:ring-0"
                required
              />
            </DialogHeader>

            <main className="flex min-h-[280px] flex-none flex-col px-6 pb-3 lg:min-h-0 lg:[grid-area:main] lg:px-10 lg:pb-6">
              <TaskDescriptionEditor
                value={description}
                onChange={setDescription}
              />
              <p className="mt-auto flex h-[50px] flex-none items-center text-[12px] text-[var(--text-muted)]">
                Fixed events reserve this time and are never moved by
                auto-scheduling.
              </p>
            </main>

            <aside className="needt-panel-depth flex-none border-t border-[var(--border-subtle)] lg:min-h-0 lg:overflow-y-auto lg:[grid-area:aside] lg:border-l lg:border-t-0">
              <div className="space-y-0.5 border-b border-[var(--border-subtle)] px-5 py-4 text-[13px]">
                <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                  <span className="w-[76px] text-[var(--text-secondary)]">
                    Calendar:
                  </span>
                  <Select
                    value={selectedFeedId}
                    onValueChange={(value) => setSelectedFeedId(value)}
                    disabled={!!event?.id}
                  >
                    <SelectTrigger
                      id="calendar"
                      data-testid="calendar-select"
                      className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none sm:h-[28px]"
                    >
                      <SelectValue placeholder="Select a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeds
                        .filter((feed) => feed.enabled)
                        .map((feed) => (
                          <SelectItem key={feed.id} value={feed.id}>
                            {feed.name}{" "}
                            {feed.type === "GOOGLE" ? "(Google)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                  <Label
                    htmlFor="location"
                    className="w-[76px] text-[var(--text-secondary)]"
                  >
                    Location:
                  </Label>
                  <Input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location"
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 sm:h-[28px]"
                  />
                </div>
              </div>

              <div className="space-y-0.5 border-b border-[var(--border-subtle)] px-5 py-3 text-[13px]">
                <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                  <span className="w-[76px] text-[var(--text-secondary)]">
                    Start:
                  </span>
                  <DatePicker
                    value={startDate}
                    onChange={(date) => date && setStartDate(date)}
                    includeTime={!isAllDay}
                    showIcon={false}
                    ariaLabel="Choose event start"
                    className="min-h-11 min-w-0 flex-1 px-0 sm:h-[28px] sm:min-h-0"
                  />
                </div>
                <div className="flex min-h-11 items-center gap-2 sm:h-[30px] sm:min-h-0">
                  <span className="w-[76px] text-[var(--text-secondary)]">
                    End:
                  </span>
                  <DatePicker
                    value={endDate}
                    onChange={(date) => date && setEndDate(date)}
                    includeTime={!isAllDay}
                    showIcon={false}
                    ariaLabel="Choose event end"
                    className="min-h-11 min-w-0 flex-1 px-0 sm:h-[28px] sm:min-h-0"
                  />
                </div>
                <label className="flex min-h-11 items-center justify-between gap-3 sm:h-[30px] sm:min-h-0">
                  <span className="text-[var(--text-secondary)]">All day</span>
                  <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                </label>
                <label className="flex min-h-11 items-center justify-between gap-3 sm:h-[30px] sm:min-h-0">
                  <span className="text-[var(--text-secondary)]">
                    Recurring
                  </span>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      setIsRecurring(checked);
                      if (
                        checked &&
                        (recurrenceFreq === FREQUENCIES.NONE || !recurrenceFreq)
                      ) {
                        setRecurrenceFreq(FREQUENCIES.WEEKLY);
                        setRecurrenceByDay([
                          ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][
                            startDate.getDay()
                          ],
                        ]);
                      }
                    }}
                  />
                </label>
              </div>

              {isRecurring && (
                <div className="border-b border-[var(--border-subtle)] px-5 py-4 text-[13px]">
                  {renderRecurrenceOptions()}
                </div>
              )}
            </aside>

            <footer className={CALENDAR_EDITOR_MAIN_FOOTER_CLASS}>
              {event?.id ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  data-testid="delete-event-button"
                >
                  Delete
                </Button>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Event details
                </span>
              )}
            </footer>
            <div className={CALENDAR_EDITOR_ASIDE_FOOTER_CLASS}>
              <span className="mr-auto text-[11px] text-[var(--text-muted)]">
                {isSubmitting ? "Saving…" : "All changes saved"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-11 px-2 text-[13px] text-[var(--text-secondary)] sm:h-[30px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                data-testid="save-event-button"
                className="h-11 px-3 text-[13px] sm:h-[34px]"
              >
                {event?.id ? "Save changes" : "Save event"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Event Edit Mode Dialog */}
      <AlertDialog.Root
        open={showRecurrenceDialog}
        onOpenChange={(open) => {
          setShowRecurrenceDialog(open);
          if (!open) onClose();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="needt-scrim fixed inset-0 z-[10001]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[10002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
            <AlertDialog.Title className="mb-4 text-lg font-semibold">
              Edit Recurring Event
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-6 text-sm text-muted-foreground">
              Would you like to edit this event or the entire series?
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRecurrenceDialog(false);
                  onClose();
                }}
                data-testid="edit-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEditMode("single");
                  setShowRecurrenceDialog(false);
                }}
                data-testid="edit-single-event-button"
              >
                This Event
              </Button>
              <Button
                onClick={() => {
                  setEditMode("series");
                  setShowRecurrenceDialog(false);
                }}
                data-testid="edit-series-button"
              >
                Entire Series
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );

  function resetState() {
    setShowRecurrenceDialog(false);
    setEditMode(undefined);
    setTitle("");
    setDescription("");
    setLocation("");
    setStartDate(newDate());
    setEndDate(newDate(Date.now() + 3600000));
    setIsAllDay(false);
    setIsRecurring(false);
    setRecurrenceFreq("");
    setRecurrenceInterval(1);
    setRecurrenceByDay([]);
  }
}
