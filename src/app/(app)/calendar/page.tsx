import { CalendarRoute } from "@/components/needt/calendar/CalendarRoute";

export default function CalendarPage() {
  return (
    <div className="absolute inset-0 max-lg:bottom-[calc(68px+env(safe-area-inset-bottom))] max-lg:top-14">
      <CalendarRoute />
    </div>
  );
}
