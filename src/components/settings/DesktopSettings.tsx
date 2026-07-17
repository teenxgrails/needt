"use client";

import { useState } from "react";

import { CalendarDays, ListPlus, MonitorDown } from "lucide-react";

import { DownloadAppsModal } from "@/components/navigation/DownloadAppsModal";
import { Button } from "@/components/ui/button";

import { SettingsSection } from "./SettingsSection";

const shortcuts = [
  { label: "Add task", keys: ["⌥", "Space"], icon: ListPlus },
  { label: "Open calendar", keys: ["⌥", "C"], icon: CalendarDays },
];

export function DesktopSettings() {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <>
      <div className="space-y-9">
        <SettingsSection
          title="Don't have the desktop app yet?"
          description="Install Needt as an app for faster access and a focused window."
        >
          <Button type="button" onClick={() => setDownloadOpen(true)}>
            <MonitorDown />
            Download desktop app
          </Button>
        </SettingsSection>

        <SettingsSection
          title="Keyboard shortcuts"
          description="Use these shortcuts anywhere while Needt is open."
        >
          <div className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-control)]">
            {shortcuts.map(({ label, keys, icon: Icon }) => (
              <div
                key={label}
                className="flex h-12 items-center gap-3 border-t border-[var(--border-subtle)] px-4 first:border-t-0"
              >
                <Icon
                  className="h-4 w-4 text-[var(--text-secondary)]"
                  strokeWidth={1.75}
                />
                <span className="flex-1 text-[14px]">{label}</span>
                <span className="flex gap-1">
                  {keys.map((key) => (
                    <kbd
                      key={key}
                      className="min-w-6 rounded border border-[var(--border-control)] bg-[var(--surface-control)] px-1.5 py-0.5 text-center text-[11px] text-[var(--text-secondary)]"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </SettingsSection>
      </div>

      <DownloadAppsModal open={downloadOpen} onOpenChange={setDownloadOpen} />
    </>
  );
}
