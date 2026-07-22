"use client";

import { Apple, Monitor, Smartphone } from "lucide-react";
import { BsWindows } from "react-icons/bs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { APP_NAME } from "@/lib/app-config";

interface DownloadAppsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ComingSoon() {
  return (
    <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
      Coming soon
    </span>
  );
}

function PlatformCard({
  icon,
  title,
  badge,
  steps,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  steps: string[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[var(--text-primary)]">{icon}</span>
        <h3 className="flex-1 text-[13px] font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {badge}
      </div>
      <ol className="space-y-1.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-[var(--text-muted)]">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DownloadAppsModal({
  open,
  onOpenChange,
}: DownloadAppsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-[var(--border-subtle)] px-6 py-5">
          <DialogTitle className="text-base">Get {APP_NAME}</DialogTitle>
          <DialogDescription>
            Install {APP_NAME} as an app. Native apps are on the way — for now
            you can add the web app to your device.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          <PlatformCard
            icon={<Smartphone className="h-4 w-4" strokeWidth={1.75} />}
            title="iPhone / iPad"
            badge={<ComingSoon />}
            steps={[
              "Open this site in Safari.",
              "Tap the Share button.",
              "Choose “Add to Home Screen”.",
              "Open it from your home screen like a native app.",
            ]}
          />
          <PlatformCard
            icon={<Apple className="h-4 w-4" strokeWidth={1.75} />}
            title="macOS"
            badge={<ComingSoon />}
            steps={[
              "Open this site in Safari or Chrome.",
              "Safari: File → Add to Dock. Chrome: Install icon in the address bar.",
              "Launch it from the Dock or Launchpad.",
            ]}
          />
          <PlatformCard
            icon={<BsWindows className="h-4 w-4" />}
            title="Windows"
            badge={<ComingSoon />}
            steps={[
              "Open this site in Chrome or Edge.",
              "Click the Install icon in the address bar (or menu → Install).",
              "Launch it from the Start menu.",
            ]}
          />
          <PlatformCard
            icon={<Monitor className="h-4 w-4" strokeWidth={1.75} />}
            title="Android"
            badge={<ComingSoon />}
            steps={[
              "Open this site in Chrome.",
              "Tap the menu (⋮) → “Install app” / “Add to Home screen”.",
              "Open it from your home screen.",
            ]}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
