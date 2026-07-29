"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { AIActionCursor } from "@/components/ai/AIActionCursor";
import { AIChatOverlay } from "@/components/ai/AIChatOverlay";
import { AICompanion } from "@/components/ai/AICompanion";
import { DndProvider } from "@/components/dnd/DndProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { SetupCheck } from "@/components/setup/SetupCheck";
import { CommandPalette } from "@/components/ui/command-palette";
import { CommandPaletteFab } from "@/components/ui/command-palette-fab";
import { CommandPaletteHint } from "@/components/ui/command-palette-hint";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

import { usePageTitle } from "@/hooks/use-page-title";

import { useShortcutsStore } from "@/store/shortcuts";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [chatOverlayOpen, setChatOverlayOpen] = useState(false);
  const pathname = usePathname();
  const { isOpen: shortcutsOpen, setOpen: setShortcutsOpen } =
    useShortcutsStore();

  // The calendar keeps a neutral canvas so the grid and event colours stay
  // readable, and settings renders its own full-height shell that the veil
  // would cut across. Every other route gets the ambient veil.
  const hideAurora = ["/calendar", "/settings"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Use the page title hook
  usePageTitle();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setChatOverlayOpen((open) => !open);
      } else if (e.key === "?" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setShortcutsOpen]);

  return (
    <div
      className={cn(
        "needt-page-depth relative flex min-h-dvh",
        pathname === "/today" && "xl:h-dvh xl:overflow-hidden"
      )}
    >
      {/* Ambient aurora veil, spanning the whole shell (sidebar included) so the
          window reads as one surface. Sits behind everything: screen and
          sidebar backgrounds are transparent inside the shell. Decorative only —
          pointer-events-none, and animated purely via `transform`. */}
      <div
        className={cn("needt-aurora", hideAurora && "needt-aurora--hidden")}
        aria-hidden="true"
      >
        <span className="needt-aurora-blob" />
        <span className="needt-aurora-blob" />
        <span className="needt-aurora-blob" />
      </div>
      <PrivacyProvider>
        <DndProvider>
          <TooltipProvider delayDuration={400}>
            <SetupCheck />
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
            />
            <CommandPaletteHint />
            <CommandPaletteFab />
            <ShortcutsModal
              isOpen={shortcutsOpen}
              onClose={() => setShortcutsOpen(false)}
            />
            <AppNav onOpenChatOverlay={() => setChatOverlayOpen(true)} />
            <main
              className={cn(
                "needt-route-content relative min-w-0 flex-1 max-lg:pb-[calc(68px+env(safe-area-inset-bottom))] max-sm:pb-[calc(92px+env(safe-area-inset-bottom))]",
                pathname.startsWith("/settings") &&
                  "max-lg:h-dvh max-lg:overflow-hidden max-lg:pb-0",
                pathname === "/today" &&
                  "xl:h-dvh xl:min-h-0 xl:overflow-hidden"
              )}
            >
              <NotificationProvider>
                <div
                  key={pathname}
                  className={cn(
                    "needt-mobile-route-fallback relative z-[1] min-h-full",
                    pathname === "/today" &&
                      "xl:h-full xl:min-h-0 xl:overflow-hidden"
                  )}
                >
                  {children}
                </div>
              </NotificationProvider>
            </main>
            <AIChatOverlay
              open={chatOverlayOpen}
              onOpenChange={setChatOverlayOpen}
            />
            <AICompanion
              hidden={chatOverlayOpen}
              onOpenChat={() => setChatOverlayOpen(true)}
            />
            <AIActionCursor />
            <Toaster />
          </TooltipProvider>
        </DndProvider>
      </PrivacyProvider>
    </div>
  );
}
