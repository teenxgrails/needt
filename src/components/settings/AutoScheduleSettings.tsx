import { useEffect } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import {
  parseSelectedCalendars,
  stringifySelectedCalendars,
} from "@/lib/autoSchedule";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function AutoScheduleSettings() {
  const { autoSchedule, updateAutoScheduleSettings } = useSettingsStore();
  const { feeds, loadFromDatabase } = useCalendarStore();

  // Load calendar feeds when component mounts
  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const selectedCalendars = parseSelectedCalendars(
    autoSchedule.selectedCalendars
  );

  return (
    <SettingsSection
      title="Scheduling"
      description="Set the calendar, working time, and delivery behavior used for automatic task scheduling."
    >
      <SettingRow
        label="Calendars to Consider"
        description="Select which calendars to check for conflicts when auto-scheduling"
      >
        <div className="space-y-2">
          {feeds.map((feed) => (
            <div key={feed.id} className="flex items-center space-x-2">
              <Switch
                checked={selectedCalendars.includes(feed.id)}
                onCheckedChange={(checked) => {
                  const calendars = checked
                    ? [...selectedCalendars, feed.id]
                    : selectedCalendars.filter((id) => id !== feed.id);
                  updateAutoScheduleSettings({
                    selectedCalendars: stringifySelectedCalendars(calendars),
                  });
                }}
              />
              <Label className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: feed.color || "var(--muted)" }}
                />
                {feed.name}
              </Label>
            </div>
          ))}
          {feeds.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No calendars found. Please add calendars in the Calendar Settings.
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Buffer Time"
        description="Minutes to leave between scheduled tasks"
      >
        <div className="space-y-4">
          <Slider
            value={[autoSchedule.bufferMinutes]}
            onValueChange={([value]) =>
              updateAutoScheduleSettings({ bufferMinutes: value })
            }
            min={0}
            max={60}
            step={5}
          />
          <div className="text-sm text-muted-foreground">
            Current buffer: {autoSchedule.bufferMinutes} minutes
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Project Grouping"
        description="Try to schedule tasks from the same project together"
      >
        <Switch
          checked={autoSchedule.groupByProject}
          onCheckedChange={(checked) =>
            updateAutoScheduleSettings({ groupByProject: checked })
          }
        />
      </SettingRow>

      <SettingRow
        label="Push Scheduled Tasks to Calendar"
        description="Automatically create calendar events for scheduled task blocks"
      >
        <div className="space-y-4">
          <Switch
            checked={autoSchedule.pushTasksToCalendar || false}
            onCheckedChange={(checked) =>
              updateAutoScheduleSettings({
                pushTasksToCalendar: checked,
                // Preserve feed selection when toggling; user can re-enable without reconfiguring
              })
            }
          />

          {autoSchedule.pushTasksToCalendar && (
            <div>
              <Label>Target Calendar</Label>
              <Select
                value={autoSchedule.pushTasksFeedId || ""}
                onValueChange={(value) =>
                  updateAutoScheduleSettings({
                    pushTasksFeedId: value || null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {feeds
                    .filter((feed) => feed.type === "GOOGLE")
                    .map((feed) => (
                      <SelectItem key={feed.id} value={feed.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: feed.color || "var(--muted)",
                            }}
                          />
                          {feed.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {feeds.filter((feed) => feed.type === "GOOGLE").length === 0 && (
                <div className="text-sm text-muted-foreground mt-2">
                  No Google calendars found. Please connect a Google account in
                  Calendar Settings.
                </div>
              )}
            </div>
          )}
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
