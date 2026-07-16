"use client";

import { useEffect, useMemo, useState } from "react";

import { Lock, Palette, Save } from "lucide-react";
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

import { cn } from "@/lib/utils";

import { SettingRow, SettingsSection } from "./SettingsSection";

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

const lockedThemes = [
  ["Aurora", "Layered gradients and softer panels."],
  ["Studio", "Editorial contrast with compact rows."],
  ["Terminal", "Monospace, hard lines, low chrome."],
];

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
      borderColor: "var(--line-strong)",
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
      title="Customization"
      description="Tune density, radius, sidebar, and motion behavior."
    >
      <SettingRow
        label="Layout"
        description="Keep the Motion-style density, with room for personal preference."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Density</Label>
            <Select
              value={settings.density}
              onValueChange={(value) =>
                update("density", value as CustomizationState["density"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sidebar width</Label>
            <Input
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
            <Label>Radius</Label>
            <Input
              type="number"
              min={4}
              max={16}
              value={settings.radius}
              onChange={(event) => update("radius", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Event chips</Label>
            <Select
              value={settings.eventChipStyle}
              onValueChange={(value) =>
                update(
                  "eventChipStyle",
                  value as CustomizationState["eventChipStyle"]
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="outlined">Outlined</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Accent color"
        description="Use color for selection, focus, and interactive states."
      >
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update("accentColor", color)}
              className={cn(
                "h-7 w-7 rounded-md border-2 transition-transform hover:scale-105",
                settings.accentColor.toUpperCase() === color
                  ? "border-white"
                  : "border-transparent"
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
        label="Background and motion"
        description="Flowday stays flat by default; animations can be disabled globally."
      >
        <div className="space-y-3">
          <Input
            value={settings.backgroundTint}
            onChange={(event) => update("backgroundTint", event.target.value)}
            aria-label="Background color"
          />
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">Animations</span>
            <Switch
              checked={settings.animationsEnabled}
              onCheckedChange={(checked) =>
                update("animationsEnabled", checked)
              }
            />
          </label>
          <div className="rounded-md border p-3" style={previewStyle}>
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" />
              Live Flowday preview
            </div>
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Themes"
        description="Three future visual systems are reserved without changing the current product."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {lockedThemes.map(([name, description]) => (
            <button
              key={name}
              type="button"
              className="cursor-not-allowed rounded-md border border-[var(--line-strong)] bg-[var(--raised)] p-3 text-left opacity-80"
              aria-disabled="true"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-sm font-medium">
                {name}
                <span className="inline-flex items-center gap-1 rounded bg-[var(--active)] px-1.5 py-0.5 text-[10px] text-[var(--text-lo)]">
                  <Lock className="h-3 w-3" />
                  Coming soon
                </span>
              </div>
              <p className="text-xs text-[var(--text-lo)]">{description}</p>
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save customization"}
        </Button>
      </div>
    </SettingsSection>
  );
}
