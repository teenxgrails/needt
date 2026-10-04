import { useTheme } from "@/components/providers/ThemeProvider";
import { MotionSwitchRow } from "@/components/settings/MotionSettingsControls";
import { NeedtPicker } from "@/components/ui/needt-picker";

import { THEME_MODES, THEME_MODE_LABELS } from "@/lib/theme";
import { COMMON_TIME_ZONES, getTimeZoneDisplayName } from "@/lib/time-zones";

import { useSettingsStore } from "@/store/settings";

import {
  ResolvedThemeMode,
  ThemeMode,
  TimeFormat,
  WeekStartDay,
} from "@/types/settings";

import { SettingsSection } from "./SettingsSection";

interface UserSettingsProps {
  page?: "all" | "theme" | "timezone";
}

export function UserSettings({ page = "all" }: UserSettingsProps) {
  const { calendar, updateCalendarSettings, updateUserSettings, user } =
    useSettingsStore();
  const { setTheme, systemTheme, setSystemTheme } = useTheme();

  const timeFormats: { value: TimeFormat; label: string }[] = [
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" },
  ];

  const weekStarts: { value: WeekStartDay; label: string }[] = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
  ];

  const themes = THEME_MODES.map((mode) => ({
    value: mode,
    label: mode === "system" ? "Use system setting" : THEME_MODE_LABELS[mode],
  }));

  // System is a pair: which theme fills the light half of the OS preference,
  // and which fills the dark half.
  const pairOptions = THEME_MODES.filter(
    (mode): mode is ResolvedThemeMode => mode !== "system"
  ).map((mode) => ({ value: mode, label: THEME_MODE_LABELS[mode] }));

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
            <NeedtPicker
              label="Theme"
              value={user.theme}
              valueLabel={
                themes.find((theme) => theme.value === user.theme)?.label
              }
              options={themes.map((theme) => ({ ...theme }))}
              onValueChange={(value) => setTheme(value as ThemeMode)}
            />
            {user.theme === "system" && (
              <>
                <NeedtPicker
                  label="System light half"
                  value={systemTheme.light}
                  valueLabel={THEME_MODE_LABELS[systemTheme.light]}
                  options={pairOptions}
                  onValueChange={(value) =>
                    setSystemTheme({
                      ...systemTheme,
                      light: value as ResolvedThemeMode,
                    })
                  }
                />
                <NeedtPicker
                  label="System dark half"
                  value={systemTheme.dark}
                  valueLabel={THEME_MODE_LABELS[systemTheme.dark]}
                  options={pairOptions}
                  onValueChange={(value) =>
                    setSystemTheme({
                      ...systemTheme,
                      dark: value as ResolvedThemeMode,
                    })
                  }
                />
              </>
            )}
            <NeedtPicker
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
            <NeedtPicker
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
            <NeedtPicker
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
