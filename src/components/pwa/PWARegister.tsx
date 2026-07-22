"use client";

import { useEffect, useState } from "react";

import { WifiOff } from "lucide-react";

export function PWARegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone
      );
    document.documentElement.dataset.displayMode = standalone
      ? "standalone"
      : "browser";

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        // A production service worker caching dev chunks leaves localhost on a
        // stale client bundle after HMR/reload and can manufacture hydration
        // mismatches that do not exist in the current source.
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister())
            )
          )
          .catch(() => undefined);
      } else {
        void navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((registration) => registration.update())
          .catch(() => undefined);
      }
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
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <WifiOff className="h-4 w-4 text-[var(--color-warning)]" />
      Offline mode. Changes will sync on reconnect.
    </div>
  );
}
