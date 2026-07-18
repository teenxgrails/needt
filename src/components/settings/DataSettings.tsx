import { MotionSwitchRow } from "@/components/settings/MotionSettingsControls";
import { Input } from "@/components/ui/input";

import { useSettingsStore } from "@/store/settings";

import {
  SettingRow,
  SettingsAdvanced,
  SettingsSection,
} from "./SettingsSection";

export function DataSettings() {
  const { data, updateDataSettings } = useSettingsStore();

  return (
    <SettingsSection
      title="Storage"
      description="Choose how long Needt keeps older planner data."
    >
      <SettingRow
        label="Automatic backup"
        description="Keep a periodic local backup of planner data."
      >
        <div className="space-y-3">
          <MotionSwitchRow
            label="Enabled"
            checked={data.autoBackup}
            onCheckedChange={(autoBackup) => updateDataSettings({ autoBackup })}
          />

          {data.autoBackup && (
            <div className="max-w-[160px] space-y-2">
              <label
                className="text-[12px] text-[var(--text-secondary)]"
                htmlFor="backup-interval"
              >
                Backup every (days)
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

      <SettingsAdvanced
        title="Retention"
        description="Archive older events without deleting current tasks."
      >
        <SettingRow
          label="Event history"
          description="Events older than this can be archived by maintenance jobs."
        >
          <div className="max-w-[180px] space-y-2">
            <label
              className="text-[12px] text-[var(--text-secondary)]"
              htmlFor="retain-data"
            >
              Days to retain
            </label>
            <Input
              id="retain-data"
              type="number"
              min="30"
              max="3650"
              value={data.retainDataFor}
              onChange={(event) =>
                updateDataSettings({
                  retainDataFor: Number(event.target.value),
                })
              }
            />
          </div>
        </SettingRow>
      </SettingsAdvanced>
    </SettingsSection>
  );
}
