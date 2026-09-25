"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { APP_NAME } from "@/lib/app-config";
import { format, newDate } from "@/lib/date-utils";
import type { NeedtCalendarMap } from "@/lib/needt/types";
import { notify } from "@/lib/notifications";

import type { CalendarEntry } from "./entries";

interface CalendarEventDialogProps {
  open: boolean;
  entry: CalendarEntry | null;
  calendars: NeedtCalendarMap;
  defaultStart: Date;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}

function inputValue(value: string | undefined, fallback: Date) {
  return format(value ? newDate(value) : fallback, "yyyy-MM-dd'T'HH:mm");
}

export function CalendarEventDialog({
  open,
  entry,
  calendars,
  defaultStart,
  canEdit,
  onClose,
  onSaved,
}: CalendarEventDialogProps) {
  const defaultEnd = React.useMemo(
    () => newDate(defaultStart.getTime() + 60 * 60 * 1000),
    [defaultStart]
  );
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [allDay, setAllDay] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setDescription(entry?.description ?? "");
    setLocation(entry?.location ?? "");
    setStart(inputValue(entry?.seriesStart ?? entry?.scheduledStart, defaultStart));
    setEnd(inputValue(entry?.seriesEnd ?? entry?.scheduledEnd, defaultEnd));
    setAllDay(Boolean(entry?.allDay));
  }, [defaultEnd, defaultStart, entry, open]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || !title.trim() || pending) return;
    setPending(true);
    try {
      let feedId = entry?.feedId ?? Object.keys(calendars)[0];
      if (!feedId) {
        const feedResponse = await fetch("/api/feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: APP_NAME,
            type: "LOCAL",
            color: "#6366F1",
            enabled: true,
          }),
        });
        if (!feedResponse.ok) throw new Error("Could not create a calendar");
        feedId = ((await feedResponse.json()) as { id: string }).id;
      }

      const response = await fetch("/api/events", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(entry ? { id: entry.sourceId ?? entry.id } : {}),
          feedId,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start: newDate(start).toISOString(),
          end: newDate(end).toISOString(),
          allDay,
          isRecurring: entry?.isRecurring ?? false,
          recurrenceRule: entry?.recurrenceRule ?? null,
        }),
      });
      if (!response.ok) throw new Error("Could not save this event");
      await onSaved();
      onClose();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not save this event");
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!entry || !canEdit || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.sourceId ?? entry.id }),
      });
      if (!response.ok) throw new Error("Could not remove this event");
      await onSaved();
      onClose();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not remove this event");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="needt-v2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {entry?.isRecurring
              ? "Changes apply to this recurring series."
              : "Events stay where you place them. Tasks can be moved by the planner."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-event-title">Title</Label>
            <Input
              id="calendar-event-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canEdit || pending}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="calendar-event-start">Starts</Label>
              <Input
                id="calendar-event-start"
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                disabled={!canEdit || pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calendar-event-end">Ends</Label>
              <Input
                id="calendar-event-end"
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                disabled={!canEdit || pending}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              disabled={!canEdit || pending}
            />
            All day
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-event-location">Location</Label>
            <Input
              id="calendar-event-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              disabled={!canEdit || pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calendar-event-description">Notes</Label>
            <Textarea
              id="calendar-event-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!canEdit || pending}
            />
          </div>
          <DialogFooter className="gap-2">
            {entry && canEdit ? (
              <button
                type="button"
                className="min-h-11 rounded-[var(--radius-md)] px-4 text-sm text-[var(--destructive)] shadow-[var(--shadow-ring)] sm:min-h-9"
                onClick={() => void remove()}
                disabled={pending}
              >
                Remove
              </button>
            ) : null}
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--fill-accent)] px-4 text-sm font-medium text-[var(--accent)] shadow-[var(--shadow-ring)] sm:min-h-9"
              disabled={!canEdit || pending}
            >
              {pending ? "Saving…" : "Save event"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
