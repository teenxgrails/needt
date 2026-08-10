export interface PrivateCalendarBusyInterval {
  id: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export function toWorkspaceBusyEvent(event: PrivateCalendarBusyInterval) {
  const opaqueId = createHash("sha256").update(event.id).digest("hex");
  return {
    id: `workspace-busy:${opaqueId}`,
    feedId: "workspace-busy",
    externalEventId: null,
    title: "Busy",
    description: null,
    start: event.start,
    end: event.end,
    location: null,
    isRecurring: false,
    recurrenceRule: null,
    allDay: event.allDay,
    status: "confirmed",
    sequence: null,
    created: null,
    lastModified: null,
    organizer: null,
    attendees: null,
    isMaster: false,
    masterEventId: null,
    recurringEventId: null,
    feed: { name: "Busy", color: null },
  };
}
import { createHash } from "crypto";
