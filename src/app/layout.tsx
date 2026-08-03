import Script from "next/script";

import { AmbientBackdrop } from "@/components/liquid";
import { Providers } from "@/components/providers";

import "./globals.css";
import { metadata as baseMetadata, viewport as baseViewport } from "./metadata";

export const metadata = baseMetadata;
export const viewport = baseViewport;

// The <html> element below always SSRs with the "dark" class as a static
// default (matching defaultSettings.user.theme). ThemeProvider only corrects
// this client-side via a useEffect, which runs after first paint — visible
// as a brief flash to the wrong theme on every load for anyone whose actual
// preference differs from "dark". This script re-applies the persisted
// preference synchronously, before hydration, using the same class logic as
// ThemeProvider/lib/theme.ts (kept in sync manually since it must run
// as plain JS, before any app code is available).
const THEME_INIT_SCRIPT = `(function () {
  try {
    var raw = window.localStorage.getItem("calendar-settings");
    if (!raw) return;
    var theme = JSON.parse(raw)?.state?.user?.theme;
    if (!theme) return;
    if (theme === "gray") theme = "graphite";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    var root = document.documentElement;
    root.classList.remove("light", "dark", "theme-gray", "theme-graphite", "theme-dark");
    if (resolved === "graphite") root.classList.add("dark", "theme-graphite");
    else if (resolved === "dark") root.classList.add("dark", "theme-dark");
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark h-full"
      data-app-theme="needt"
      data-needt-motion="on"
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="flex h-full flex-col bg-[var(--surface-canvas)] antialiased">
        <AmbientBackdrop />
        <div className="relative z-10 flex min-h-full flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
