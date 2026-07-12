"use client";

import { useEffect, useMemo, useState } from "react";

import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { SettingRow, SettingsSection } from "./SettingsSection";

type SchedulingEnergyLevel = "LOW" | "MEDIUM" | "HIGH";

interface EnergyProfileWindow {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  energyLevel: SchedulingEnergyLevel;
  sortOrder?: number;
}

interface SchedulingPreferences {
  workHours: Record<string, { start: string; end: string }>;
  bufferMinutes: number;
  maxDeepWorkPerDay: number;
  minBreakMinutes: number;
  autoRescheduleOnMiss: boolean;
  enableBodyDoubling: boolean;
  enableTaskBatching: boolean;
  hardStopTime: string;
  bufferMultiplier: number;
}

interface SmartSchedulingResponse {
  preferences: SchedulingPreferences;
  energyProfile: EnergyProfileWindow[];
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const value = `${hours.toString().padStart(2, "0")}:${minutes}`;
  return { value, label: value };
});

const DEFAULT_WORK_HOURS = {
  "1": { start: "09:00", end: "17:00" },
  "2": { start: "09:00", end: "17:00" },
  "3": { start: "09:00", end: "17:00" },
  "4": { start: "09:00", end: "17:00" },
  "5": { start: "09:00", end: "17:00" },
};

const DEFAULT_PREFERENCES: SchedulingPreferences = {
  workHours: DEFAULT_WORK_HOURS,
  bufferMinutes: 15,
  maxDeepWorkPerDay: 180,
  minBreakMinutes: 15,
  autoRescheduleOnMiss: true,
  enableBodyDoubling: false,
  enableTaskBatching: true,
  hardStopTime: "18:00",
  bufferMultiplier: 1.3,
};

export function SmartSchedulingSettings() {
  const [preferences, setPreferences] =
    useState<SchedulingPreferences>(DEFAULT_PREFERENCES);
  const [energyProfile, setEnergyProfile] = useState<EnergyProfileWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/smart-scheduling-settings");
        if (!response.ok) {
          throw new Error("Failed to load smart scheduling settings");
        }
        const data = (await response.json()) as SmartSchedulingResponse;
        if (cancelled) return;
        setPreferences(data.preferences);
        setEnergyProfile(data.energyProfile);
      } catch (error) {
        toast.error("Could not load smart scheduling settings", {
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedEnergyProfile = useMemo(
    () =>
      [...energyProfile].sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek ||
          a.startTime.localeCompare(b.startTime) ||
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [energyProfile]
  );

  const updatePreference = <Key extends keyof SchedulingPreferences>(
    key: Key,
    value: SchedulingPreferences[Key]
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const updateEnergyWindow = (
    index: number,
    updates: Partial<EnergyProfileWindow>
  ) => {
    setEnergyProfile((current) =>
      current.map((window, currentIndex) =>
        currentIndex === index ? { ...window, ...updates } : window
      )
    );
  };

  const addEnergyWindow = () => {
    setEnergyProfile((current) => [
      ...current,
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        energyLevel: "MEDIUM",
        sortOrder: current.length,
      },
    ]);
  };

  const removeEnergyWindow = (index: number) => {
    setEnergyProfile((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/smart-scheduling-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences,
          energyProfile: energyProfile.map((window, index) => ({
            ...window,
            sortOrder: index,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save smart scheduling settings");
      }

      const data = (await response.json()) as SmartSchedulingResponse;
      setPreferences(data.preferences);
      setEnergyProfile(data.energyProfile);
      toast.success("Smart scheduling settings saved");
    } catch (error) {
      toast.error("Could not save smart scheduling settings", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SettingsSection
        title="Energy & focus"
        description="Loading the energy profile and focus preferences."
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Energy & focus"
      description="Tune the energy curve and focus constraints used by the planner."
    >
      <SettingRow
        label="Energy Profile"
        description="Daily windows that tell the scheduler when deep work, admin, or recovery blocks fit best."
      >
        <div className="space-y-3">
          {sortedEnergyProfile.map((window) => {
            const index = energyProfile.indexOf(window);
            return (
              <div
                key={`${window.dayOfWeek}-${window.startTime}-${window.endTime}-${index}`}
                className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <Select
                  value={window.dayOfWeek.toString()}
                  onValueChange={(value) =>
                    updateEnergyWindow(index, { dayOfWeek: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={window.startTime}
                  onValueChange={(value) =>
                    updateEnergyWindow(index, { startTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={window.endTime}
                  onValueChange={(value) =>
                    updateEnergyWindow(index, { endTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>
                        {time.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={window.energyLevel}
                  onValueChange={(value) =>
                    updateEnergyWindow(index, {
                      energyLevel: value as SchedulingEnergyLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEnergyWindow(index)}
                  aria-label="Remove energy window"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={addEnergyWindow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Window
          </Button>
        </div>
      </SettingRow>

      <SettingRow
        label="Break & estimate buffers"
        description="Set the minimum break and time-blindness multiplier for scheduled work."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minBreakMinutes">Min break</Label>
            <Input
              id="minBreakMinutes"
              type="number"
              min={0}
              value={preferences.minBreakMinutes}
              onChange={(event) =>
                updatePreference("minBreakMinutes", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bufferMultiplier">Multiplier</Label>
            <Input
              id="bufferMultiplier"
              type="number"
              min={1}
              step={0.1}
              value={preferences.bufferMultiplier}
              onChange={(event) =>
                updatePreference("bufferMultiplier", Number(event.target.value))
              }
            />
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Deep Work Limit"
        description="Daily maximum for high-energy focus blocks and the latest hard stop."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxDeepWorkPerDay">Max deep work minutes</Label>
            <Input
              id="maxDeepWorkPerDay"
              type="number"
              min={0}
              value={preferences.maxDeepWorkPerDay}
              onChange={(event) =>
                updatePreference(
                  "maxDeepWorkPerDay",
                  Number(event.target.value)
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hardStopTime">Hard stop</Label>
            <Input
              id="hardStopTime"
              value={preferences.hardStopTime}
              onChange={(event) =>
                updatePreference("hardStopTime", event.target.value)
              }
            />
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="ADHD Options"
        description="Cosmetic body-doubling prompts, batching, and automatic miss recovery."
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Auto-reschedule missed work</span>
            <Switch
              checked={preferences.autoRescheduleOnMiss}
              onCheckedChange={(checked) =>
                updatePreference("autoRescheduleOnMiss", checked)
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Body-doubling reminders</span>
            <Switch
              checked={preferences.enableBodyDoubling}
              onCheckedChange={(checked) =>
                updatePreference("enableBodyDoubling", checked)
              }
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Batch similar task contexts</span>
            <Switch
              checked={preferences.enableTaskBatching}
              onCheckedChange={(checked) =>
                updatePreference("enableTaskBatching", checked)
              }
            />
          </label>
        </div>
      </SettingRow>

      <div className="flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Smart Scheduling"}
        </Button>
      </div>
    </SettingsSection>
  );
}
