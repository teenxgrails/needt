import { Calendar } from "@/components/calendar/Calendar";

import { CalendarEvent, CalendarFeed } from "@/types/calendar";

// Stable references so Calendar's data-loading effect (which keys off the
// initial props) runs once instead of on every render.
const EMPTY_FEEDS: CalendarFeed[] = [];
const EMPTY_EVENTS: CalendarEvent[] = [];

// Render the calendar shell as a static route so switching into it is instant
// (prefetched, no server round-trip). The Calendar client component hydrates
// its data from the in-memory calendar store on revisit and revalidates in the
// background via `loadFromDatabase()`, so we avoid a blocking server query of
// every event on each navigation.
export default function CalendarPage() {
  return (
    <div className="absolute inset-0">
      <Calendar initialFeeds={EMPTY_FEEDS} initialEvents={EMPTY_EVENTS} />
    </div>
  );
}
