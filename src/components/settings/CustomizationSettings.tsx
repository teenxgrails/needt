"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  MotionSwitchRow,
  NeedtPicker,
} from "@/components/settings/MotionSettingsControls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

import { SettingsAdvanced, SettingsSection } from "./SettingsSection";

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
  backgroundTint: "#0E0E10",
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
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const hydrated = useRef(false);
  const lastSaved = useRef<CustomizationState>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customization")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          const loaded = {
            ...DEFAULTS,
            ...data,
            accentColor:
              typeof data.accentColor !== "string" ||
              data.accentColor.toUpperCase() === "#555B5F"
                ? DEFAULTS.accentColor
                : data.accentColor,
          } as CustomizationState;
          setSettings(loaded);
          lastSaved.current = loaded;
          queueMicrotask(() => {
            hydrated.current = true;
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
    // backgroundTint remains in the persisted payload for backwards
    // compatibility, but themes now own the canvas color.
    root.style.removeProperty("--custom-background-tint");
    root.style.setProperty("--radius", `${settings.radius}px`);
    root.style.setProperty(
      "--flowday-sidebar-width",
      `${settings.sidebarWidth}px`
    );
    root.dataset.density = settings.density;
    root.dataset.animations = settings.animationsEnabled ? "on" : "off";
  }, [settings]);

  const update = <Key extends keyof CustomizationState>(
    key: Key,
    value: CustomizationState[Key]
  ) => setSettings((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!hydrated.current) return;
    const snapshot = settings;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/customization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        if (!response.ok) throw new Error("Failed to save customization");
        const saved = {
          ...DEFAULTS,
          ...(await response.json()),
        } as CustomizationState;
        lastSaved.current = saved;
        setSaveState("saved");
      } catch {
        setSettings(lastSaved.current);
        setSaveState("failed");
        toast.error(
          "Could not save appearance. Your last saved settings were restored."
        );
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [settings]);

  return (
    <SettingsSection
      title="Personalization"
      description="Choose the accent and motion behavior used across Needt."
    >
      <div className="flex min-h-[38px] flex-wrap items-center gap-3">
        <span className="text-[14px] text-[var(--text-secondary)]">
          Accent color:
        </span>
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
      </div>

      <MotionSwitchRow
        label="Animations"
        checked={settings.animationsEnabled}
        onCheckedChange={(checked) => update("animationsEnabled", checked)}
      />

      <SettingsAdvanced
        title="Advanced appearance"
        description="Density, sizing, and calendar event style."
      >
        <div className="space-y-0.5">
          <NeedtPicker
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
          <NeedtPicker
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        </div>
      </SettingsAdvanced>

      <div
        aria-live="polite"
        className="mt-4 text-right text-[11px] text-[var(--text-muted)]"
      >
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved"}
        {saveState === "failed" && (
          <span className="text-[var(--color-danger)]">Failed · restored</span>
        )}
      </div>
    </SettingsSection>
  );
}
