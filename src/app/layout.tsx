import Script from "next/script";

import "@excalidraw/excalidraw/index.css";

import { AmbientBackdrop } from "@/components/liquid";
import { Providers } from "@/components/providers";

import { THEME_INIT_SCRIPT } from "@/lib/theme-init";

import "./globals.css";
import { metadata as baseMetadata, viewport as baseViewport } from "./metadata";

export const metadata = baseMetadata;
export const viewport = baseViewport;

const FIGMA_CAPTURE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEEDT_FIGMA_CAPTURE === "1";

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
        {FIGMA_CAPTURE_ENABLED ? (
          <Script
            id="figma-local-capture"
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="afterInteractive"
          />
        ) : null}
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
