"use client";

import { useEffect, useMemo, useState } from "react";

import { Palette, Save } from "lucide-react";
import { toast } from "sonner";

import {
  MotionPicker,
  MotionSwitchRow,
} from "@/components/settings/MotionSettingsControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { APP_NAME } from "@/lib/app-config";
import { cn } from "@/lib/utils";

import {
  SettingRow,
  SettingsAdvanced,
  SettingsCard,
  SettingsSection,
} from "./SettingsSection";

interface CustomizationState {
  accentColor: string;
  backgroundTint: string;
  density: "compact" | "comfortable" | "spacious";
  sidebarWidth: number;
  radius: number;
  fontFamily: "system" | "rounded" | "mono";
  eventChipStyle: "flat" | "outlined" | "filled";
  animationsEnabled: boolean;
}

const DEFAULTS: CustomizationState = {
  accentColor: "#6366F1",
  backgroundTint: "#1B1D1E",
  density: "comfortable",
  sidebarWidth: 244,
  radius: 8,
  fontFamily: "system",
  eventChipStyle: "flat",
  animationsEnabled: true,
};

const ACCENT_COLORS = [
  "#6366F1",
  "#4A7BFF",
  "#8B5CF6",
  "#2DD4BF",
  "#F59E0B",
  "#E64BD0",
];

export function CustomizationSettings() {
  const [settings, setSettings] = useState<CustomizationState>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customization")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setSettings({
            ...DEFAULTS,
            ...data,
            accentColor:
              typeof data.accentColor !== "string" ||
              data.accentColor.toUpperCase() === "#555B5F"
                ? DEFAULTS.accentColor
                : data.accentColor,
          });
        }
      })
      .catch(() => {
        toast.error("Could not load customization settings");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Customize semantic tokens so every shared component updates together.
    // The legacy aliases in globals.css continue to follow these values.
    root.style.removeProperty("--accent");
    root.style.removeProperty("--app-bg");
    root.style.setProperty("--color-accent", settings.accentColor);
    root.style.setProperty("--surface-canvas", settings.backgroundTint);
    root.style.setProperty("--radius", `${settings.radius}px`);
    root.style.setProperty(
      "--flowday-sidebar-width",
      `${settings.sidebarWidth}px`
    );
    root.dataset.density = settings.density;
    root.dataset.animations = settings.animationsEnabled ? "on" : "off";
  }, [settings]);

  const previewStyle = useMemo(
    () => ({
      borderRadius: settings.radius,
      backgroundColor: settings.backgroundTint,
      borderColor: "var(--border-control)",
    }),
    [settings]
  );

  const update = <Key extends keyof CustomizationState>(
    key: Key,
    value: CustomizationState[Key]
  ) => setSettings((current) => ({ ...current, [key]: value }));

  async function save() {
    try {
      setIsSaving(true);
      const response = await fetch("/api/customization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save customization");
      const data = await response.json();
      setSettings({ ...DEFAULTS, ...data });
      toast.success("Customization saved");
    } catch (error) {
      toast.error("Could not save customization", {
        description:
          error instanceof Error ? error.message : "Try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Personalization"
      description="Choose the accent and motion behavior used across Needt."
    >
      <SettingRow
        label="Accent color"
        description="Used for selected controls, links, and important actions."
      >
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update("accentColor", color)}
              className={cn(
                "h-7 w-7 rounded-[var(--control-radius)] border-2 transition-colors",
                settings.accentColor.toUpperCase() === color
                  ? "border-[var(--text-primary)]"
                  : "border-transparent hover:border-[var(--border-control)]"
              )}
              style={{ backgroundColor: color }}
              aria-label={`Use accent ${color}`}
            />
          ))}
          <Input
            type="color"
            value={settings.accentColor}
            onChange={(event) => update("accentColor", event.target.value)}
            className="h-7 w-9 p-0.5"
            aria-label="Custom accent color"
          />
        </div>
      </SettingRow>

      <SettingRow
        label="Motion"
        description={`Reduce visual movement throughout ${APP_NAME}.`}
      >
        <MotionSwitchRow
          label="Animations"
          checked={settings.animationsEnabled}
          onCheckedChange={(checked) => update("animationsEnabled", checked)}
        />
      </SettingRow>

      <SettingsAdvanced
        title="Advanced appearance"
        description="Density, sizing, background, and calendar event style."
      >
        <div className="space-y-0.5">
          <MotionPicker
            label="Density"
            value={settings.density}
            valueLabel={
              settings.density[0].toUpperCase() + settings.density.slice(1)
            }
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
            onValueChange={(value) =>
              update("density", value as CustomizationState["density"])
            }
          />
          <MotionPicker
            label="Event cards"
            value={settings.eventChipStyle}
            valueLabel={
              settings.eventChipStyle[0].toUpperCase() +
              settings.eventChipStyle.slice(1)
            }
            options={[
              { value: "flat", label: "Flat" },
              { value: "outlined", label: "Outlined" },
              { value: "filled", label: "Filled" },
            ]}
            onValueChange={(value) =>
              update(
                "eventChipStyle",
                value as CustomizationState["eventChipStyle"]
              )
            }
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="appearance-sidebar-width">Sidebar width</Label>
            <Input
              id="appearance-sidebar-width"
              type="number"
              min={220}
              max={320}
              value={settings.sidebarWidth}
              onChange={(event) =>
                update("sidebarWidth", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appearance-radius">Corner radius</Label>
            <Input
              id="appearance-radius"
              type="number"
              min={4}
              max={16}
              value={settings.radius}
              onChange={(event) => update("radius", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appearance-background">Background</Label>
            <Input
              id="appearance-background"
              value={settings.backgroundTint}
              onChange={(event) => update("backgroundTint", event.target.value)}
            />
          </div>
        </div>
        <SettingsCard className="mt-4 p-3">
          <div
            className="flex items-center gap-2 text-[13px]"
            style={previewStyle}
          >
            <Palette className="h-4 w-4 text-[var(--text-secondary)]" />
            Live {APP_NAME} preview
          </div>
        </SettingsCard>
      </SettingsAdvanced>

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={save} disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save appearance"}
        </Button>
      </div>
    </SettingsSection>
  );
}
