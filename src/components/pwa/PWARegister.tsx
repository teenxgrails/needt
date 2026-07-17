"use client";

import { useEffect, useState } from "react";

import { Download, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import { APP_NAME } from "@/lib/app-config";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWARegister() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [installed, setInstalled] = useState(false);
  // Only surface the install banner from the second visit onward, so a
  // first-time visitor isn't nagged before they've seen the app.
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    try {
      const key = "needt-visit-count";
      const count = Number(localStorage.getItem(key) ?? "0") + 1;
      localStorage.setItem(key, String(count));
      setReturning(count >= 2);
    } catch {
      // localStorage unavailable (private mode) — leave the banner suppressed.
    }

    const updateOnline = () => {
      if (typeof navigator === "undefined") return;
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (!offline && navigator.serviceWorker) {
        navigator.serviceWorker.controller?.postMessage({
          type: "FLOWDAY_SYNC_NOW",
        });
      }
    };
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const appInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  const showInstall = Boolean(installPrompt) && !installed && returning;
  if (!isOffline && !showInstall) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg">
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-amber-400" />
          Offline mode. Changes will sync on reconnect.
        </>
      ) : (
        <>
          <Download className="h-4 w-4 text-blue-400" />
          Add {APP_NAME} to your home screen
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              if (!installPrompt) return;
              await installPrompt.prompt();
              await installPrompt.userChoice;
              setInstallPrompt(null);
            }}
          >
            Add
          </Button>
        </>
      )}
    </div>
  );
}
