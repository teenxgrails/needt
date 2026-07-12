import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useSettingsStore } from "@/store/settings";

import { SettingRow, SettingsSection } from "./SettingsSection";

export function DataSettings() {
  const { data, updateDataSettings } = useSettingsStore();

  return (
    <SettingsSection
      title="Data & retention"
      description="Control local backup and retention preferences for your planner data."
    >
      <SettingRow
        label="Automatic Backup"
        description="Keep a periodic backup of your planner data."
      >
        <div className="space-y-3">
          <Switch
            checked={data.autoBackup}
            onCheckedChange={(autoBackup) => updateDataSettings({ autoBackup })}
          />

          {data.autoBackup && (
            <div className="max-w-[160px] space-y-2">
              <label
                className="text-sm text-[#9BA1A6]"
                htmlFor="backup-interval"
              >
                Every (days)
              </label>
              <Input
                id="backup-interval"
                type="number"
                min="1"
                max="30"
                value={data.backupInterval}
                onChange={(e) =>
                  updateDataSettings({
                    backupInterval: Number(e.target.value),
                  })
                }
              />
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Data Retention"
        description="Archive events after the selected number of days."
      >
        <div className="max-w-[160px] space-y-2">
          <label className="text-sm text-[#9BA1A6]" htmlFor="retain-data">
            Days to retain
          </label>
          <Input
            id="retain-data"
            type="number"
            min="30"
            max="3650"
            value={data.retainDataFor}
            onChange={(e) =>
              updateDataSettings({
                retainDataFor: Number(e.target.value),
              })
            }
          />
        </div>
      </SettingRow>

      <SettingRow label="Export Data" description="Download your calendar data">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline">
            Export as iCal
          </Button>
          <Button type="button" variant="outline">
            Export as JSON
          </Button>
        </div>
      </SettingRow>

      <SettingRow label="Clear Data" description="Remove all calendar data">
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            if (
              window.confirm(
                "Are you sure you want to clear all calendar data? This action cannot be undone."
              )
            ) {
              // TODO: Implement clear data functionality
            }
          }}
        >
          Clear All Data
        </Button>
      </SettingRow>
    </SettingsSection>
  );
}
