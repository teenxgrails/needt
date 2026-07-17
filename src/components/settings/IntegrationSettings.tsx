import { CalendarDays } from "lucide-react";
import { SiGooglecalendar } from "react-icons/si";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

const SYNC_INTERVALS = [1, 5, 10, 15, 30, 60];

export function IntegrationSettings() {
  const { integrations, updateIntegrationSettings } = useSettingsStore();

  return (
    <SettingsSection
      title="Calendar integrations"
      description="Control background synchronization for connected calendar accounts."
    >
      <SettingRow
        label="Google Calendar"
        description="Keep changes synchronized with connected Google calendars."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SiGooglecalendar className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="flex-1 text-[13px]">Enable integration</span>
            <Switch
              checked={integrations.googleCalendar.enabled}
              onCheckedChange={(enabled) =>
                updateIntegrationSettings({
                  googleCalendar: {
                    ...integrations.googleCalendar,
                    enabled,
                  },
                })
              }
            />
          </div>
          {integrations.googleCalendar.enabled && (
            <div className="grid gap-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 text-[13px]">
                Automatic sync
                <Switch
                  checked={integrations.googleCalendar.autoSync}
                  onCheckedChange={(autoSync) =>
                    updateIntegrationSettings({
                      googleCalendar: {
                        ...integrations.googleCalendar,
                        autoSync,
                      },
                    })
                  }
                />
              </label>
              <Select
                value={String(integrations.googleCalendar.syncInterval)}
                onValueChange={(value) =>
                  updateIntegrationSettings({
                    googleCalendar: {
                      ...integrations.googleCalendar,
                      syncInterval: Number(value),
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_INTERVALS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      Every {minutes} {minutes === 1 ? "minute" : "minutes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Outlook Calendar"
        description="Keep changes synchronized with connected Microsoft calendars."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="flex-1 text-[13px]">Enable integration</span>
            <Switch
              checked={integrations.outlookCalendar.enabled}
              onCheckedChange={(enabled) =>
                updateIntegrationSettings({
                  outlookCalendar: {
                    ...integrations.outlookCalendar,
                    enabled,
                  },
                })
              }
            />
          </div>
          {integrations.outlookCalendar.enabled && (
            <div className="grid gap-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 text-[13px]">
                Automatic sync
                <Switch
                  checked={integrations.outlookCalendar.autoSync}
                  onCheckedChange={(autoSync) =>
                    updateIntegrationSettings({
                      outlookCalendar: {
                        ...integrations.outlookCalendar,
                        autoSync,
                      },
                    })
                  }
                />
              </label>
              <Select
                value={String(integrations.outlookCalendar.syncInterval)}
                onValueChange={(value) =>
                  updateIntegrationSettings({
                    outlookCalendar: {
                      ...integrations.outlookCalendar,
                      syncInterval: Number(value),
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_INTERVALS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      Every {minutes} {minutes === 1 ? "minute" : "minutes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
