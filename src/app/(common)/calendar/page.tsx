import { Calendar } from "@/components/calendar/Calendar";

// Render the calendar shell as a static route so switching into it is instant
// (prefetched, no server round-trip). The Calendar client component hydrates
// its data from the in-memory calendar store on revisit and revalidates in the
// background via `loadFromDatabase()`, so we avoid a blocking server query of
// every event on each navigation.
export default function CalendarPage() {
  return (
    <div className="absolute inset-0">
      <Calendar />
    </div>
  );
}
