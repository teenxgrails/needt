import {
  MotionPicker,
  MotionSwitchRow,
} from "@/components/settings/MotionSettingsControls";

import { useSettingsStore } from "@/store/settings";

import { TimeFormat, WeekStartDay } from "@/types/settings";

import { SettingsSection } from "./SettingsSection";

interface UserSettingsProps {
  page?: "all" | "theme" | "timezone";
}

export function UserSettings({ page = "all" }: UserSettingsProps) {
  const { calendar, updateCalendarSettings, updateUserSettings, user } =
    useSettingsStore();

  const timeFormats: { value: TimeFormat; label: string }[] = [
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" },
  ];

  const weekStarts: { value: WeekStartDay; label: string }[] = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
  ];

  const themes = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "Use system setting" },
  ] as const;

  // Comprehensive list of common timezones
  const timeZones = [
    // UTC
    "UTC",
    // North America
    "America/Anchorage",
    "America/Chicago",
    "America/Denver",
    "America/Edmonton",
    "America/Halifax",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/Montreal",
    "America/New_York",
    "America/Phoenix",
    "America/Toronto",
    "America/Vancouver",
    "America/Winnipeg",
    // South America
    "America/Bogota",
    "America/Buenos_Aires",
    "America/Caracas",
    "America/Lima",
    "America/Santiago",
    "America/Sao_Paulo",
    // Europe
    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Berlin",
    "Europe/Brussels",
    "Europe/Budapest",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Helsinki",
    "Europe/Istanbul",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Moscow",
    "Europe/Oslo",
    "Europe/Paris",
    "Europe/Prague",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Zurich",
    // Asia
    "Asia/Bangkok",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Kuala_Lumpur",
    "Asia/Manila",
    "Asia/Riyadh",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Tokyo",
    // Africa
    "Africa/Cairo",
    "Africa/Casablanca",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    // Oceania
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Darwin",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",
    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Honolulu",
  ];

  return (
    <SettingsSection
      title={
        page === "theme"
          ? "Display"
          : page === "timezone"
            ? "Time & timezone"
            : "Display"
      }
      description={
        page === "timezone"
          ? "Choose how dates and times are shown throughout Needt."
          : "Choose the color mode and calendar display defaults."
      }
    >
      <div className="space-y-0.5">
        {page !== "timezone" && (
          <>
            <MotionPicker
              label="Theme"
              value={user.theme}
              valueLabel={
                themes.find((theme) => theme.value === user.theme)?.label
              }
              options={themes.map((theme) => ({ ...theme }))}
              onValueChange={(value) =>
                updateUserSettings({ theme: value as typeof user.theme })
              }
            />
            <MotionPicker
              label="Start week on"
              value={user.weekStartDay}
              valueLabel={
                weekStarts.find((day) => day.value === user.weekStartDay)?.label
              }
              options={weekStarts}
              onValueChange={(value) =>
                updateUserSettings({ weekStartDay: value as WeekStartDay })
              }
            />
            <MotionSwitchRow
              label="Shade non-working hours"
              checked={calendar.workingHours.enabled}
              onCheckedChange={(enabled) =>
                updateCalendarSettings({
                  workingHours: { ...calendar.workingHours, enabled },
                })
              }
            />
          </>
        )}

        {page !== "theme" && (
          <>
            <MotionPicker
              label="Time format"
              value={user.timeFormat}
              valueLabel={
                timeFormats.find((format) => format.value === user.timeFormat)
                  ?.label
              }
              options={timeFormats}
              onValueChange={(value) =>
                updateUserSettings({ timeFormat: value as TimeFormat })
              }
            />
            <MotionPicker
              label="Timezone"
              value={user.timeZone}
              valueLabel={user.timeZone.replace(/_/g, " ")}
              options={timeZones.map((zone) => ({
                value: zone,
                label: zone.replace(/_/g, " "),
              }))}
              onValueChange={(value) => updateUserSettings({ timeZone: value })}
              searchPlaceholder="Search timezones…"
            />
          </>
        )}
      </div>
    </SettingsSection>
  );
}
