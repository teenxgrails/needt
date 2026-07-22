import { useTheme } from "@/components/providers/ThemeProvider";
import {
  MotionPicker,
  MotionSwitchRow,
} from "@/components/settings/MotionSettingsControls";

import { COMMON_TIME_ZONES, getTimeZoneDisplayName } from "@/lib/time-zones";

import { useSettingsStore } from "@/store/settings";

import { TimeFormat, WeekStartDay } from "@/types/settings";

import { SettingsSection } from "./SettingsSection";

interface UserSettingsProps {
  page?: "all" | "theme" | "timezone";
}

export function UserSettings({ page = "all" }: UserSettingsProps) {
  const { calendar, updateCalendarSettings, updateUserSettings, user } =
    useSettingsStore();
  const { setTheme } = useTheme();

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
              onValueChange={(value) => setTheme(value as typeof user.theme)}
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
              valueLabel={getTimeZoneDisplayName(user.timeZone)}
              options={COMMON_TIME_ZONES.map((zone) => ({
                value: zone,
                label: getTimeZoneDisplayName(zone),
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
