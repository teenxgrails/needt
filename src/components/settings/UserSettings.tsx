import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useSettingsStore } from "@/store/settings";

import { TimeFormat, WeekStartDay } from "@/types/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

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
        page === "theme" ? "Theme" : page === "timezone" ? "Timezone" : "Theme"
      }
      description={
        page === "timezone"
          ? "Choose the timezone and time format used throughout Needt."
          : "Choose how Needt looks and how calendar weeks are arranged."
      }
    >
      {page !== "timezone" && (
        <>
          <SettingRow label="Theme" description="Choose the app color mode.">
            <Select
              value={user.theme}
              onValueChange={(value) =>
                updateUserSettings({ theme: value as typeof user.theme })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Start week on"
            description="Choose the first day shown in week views."
          >
            <Select
              value={user.weekStartDay}
              onValueChange={(value) =>
                updateUserSettings({ weekStartDay: value as WeekStartDay })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekStarts.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Highlight working hours"
            description="Show your schedule as a subtle highlight on the calendar."
          >
            <Switch
              checked={calendar.workingHours.enabled}
              onCheckedChange={(enabled) =>
                updateCalendarSettings({
                  workingHours: { ...calendar.workingHours, enabled },
                })
              }
            />
          </SettingRow>
        </>
      )}

      {page !== "theme" && (
        <>
          <SettingRow
            label="Time format"
            description="Choose how times are displayed."
          >
            <Select
              value={user.timeFormat}
              onValueChange={(value) =>
                updateUserSettings({ timeFormat: value as TimeFormat })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Default timezone"
            description="Tasks and events are shown in this timezone."
          >
            <Select
              value={user.timeZone}
              onValueChange={(value) => updateUserSettings({ timeZone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {timeZones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Secondary timezone"
            description="Optionally show another timezone alongside the calendar."
          >
            <Select value="none" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </>
      )}
    </SettingsSection>
  );
}
