"use client";

import { useQuery } from "@tanstack/react-query";

import { eventsInRange } from "@/lib/needt3/derive";
import {
  type ApiEvent,
  type V3Event,
  eventFromApi,
  eventPatchToApi,
} from "@/lib/needt3/map";
import { type DateRange, qk } from "@/lib/needt3/query-keys";

import {
  dropListItem,
  fetchJson,
  findListItem,
  patchListItem,
  previousFields,
  sendJson,
  useUndoableMutation,
} from "./core";
import { useTimeZone } from "./settings";

const EVENTS = qk.events();

interface ApiFeed {
  id: string;
  type: string;
  name: string;
  color?: string | null;
  enabled?: boolean;
}

/**
 * Calendar events (local-first copy, `GET /api/events`) with their source
 * resolved from the feed type. `range` keeps events that touch [from, to).
 */
export function useEvents(range?: DateRange) {
  const tz = useTimeZone();
  return useQuery({
    queryKey: qk.events(range),
    queryFn: async () => {
      const [rows, feeds] = await Promise.all([
        fetchJson<ApiEvent[]>("/api/events"),
        fetchJson<ApiFeed[]>("/api/feeds"),
      ]);
      //todo: GET /api/events has no range filter yet; filtered here.
      const typeOf = new Map(feeds.map((f) => [f.id, f.type]));
      const list = rows.map((r) => eventFromApi(r, tz, typeOf.get(r.feedId)));
      return range ? eventsInRange(list, range.from, range.to) : list;
    },
  });
}

/** The person's calendars (feeds), for the calendar picker. */
export function useCalendars() {
  return useQuery({
    queryKey: [...EVENTS, "calendars"],
    queryFn: () => fetchJson<ApiFeed[]>("/api/feeds"),
    staleTime: 5 * 60_000,
  });
}

type EventPatch = Partial<
  Pick<V3Event, "title" | "startAt" | "endAt" | "isAllDay">
>;

/** Retitle, move or resize an event; undo puts the old fields back. */
export function useUpdateEvent() {
  const tz = useTimeZone();
  return useUndoableMutation<
    { id: string; patch: EventPatch; isAllDay?: boolean },
    unknown
  >({
    scope: EVENTS,
    label: "update the event",
    inverse: (qc, { id, patch }) => {
      const cur = findListItem<V3Event>(qc, EVENTS, id);
      return cur
        ? { id, patch: previousFields(cur, patch), isAllDay: cur.isAllDay }
        : null;
    },
    optimistic: (qc, { id, patch }) =>
      patchListItem<V3Event>(qc, EVENTS, id, (e) => ({ ...e, ...patch })),
    request: ({ id, patch, isAllDay }) =>
      sendJson(
        `/api/events/${id}`,
        "PATCH",
        eventPatchToApi(patch, tz, isAllDay)
      ),
  });
}

type EventVars =
  | {
      create: Pick<V3Event, "title" | "startAt" | "endAt" | "isAllDay"> & {
        calendarId: string;
      };
    }
  | { remove: string }
  | { restore: string };

/** Create, remove (archive) and restore events — each undoes the other. */
export function useEventLifecycle() {
  const tz = useTimeZone();
  return useUndoableMutation<EventVars, ApiEvent | null>({
    scope: EVENTS,
    label: "change the event",
    inverseFromResult: true,
    inverse: (_qc, vars, result) => {
      if ("create" in vars) return result ? { remove: result.id } : null;
      if ("remove" in vars) return { restore: vars.remove };
      return { remove: vars.restore };
    },
    optimistic: (qc, vars) => {
      if ("remove" in vars) dropListItem<V3Event>(qc, EVENTS, vars.remove);
    },
    request: async (vars) => {
      if ("remove" in vars) {
        await sendJson(`/api/events/${vars.remove}`, "DELETE");
        return null;
      }
      if ("restore" in vars)
        return sendJson<ApiEvent>(`/api/events/${vars.restore}`, "PATCH", {
          restore: true,
        });
      const { calendarId, ...fields } = vars.create;
      return sendJson<ApiEvent>("/api/events", "POST", {
        feedId: calendarId,
        ...eventPatchToApi(fields, tz, fields.isAllDay),
      });
    },
  });
}
