"use client";

import { useEffect, useState } from "react";

import { AIChatOverlay } from "@/components/ai/AIChatOverlay";
import { AIActionCursor } from "@/components/ai/AIActionCursor";
import { DndProvider } from "@/components/dnd/DndProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { NotificationProvider } from "@/components/providers/NotificationProvider.open";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SetupCheck } from "@/components/setup/SetupCheck";
import { CommandPalette } from "@/components/ui/command-palette";
import { CommandPaletteFab } from "@/components/ui/command-palette-fab";
import { CommandPaletteHint } from "@/components/ui/command-palette-hint";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { usePageTitle } from "@/hooks/use-page-title";

import { useShortcutsStore } from "@/store/shortcuts";

import "../globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [chatOverlayOpen, setChatOverlayOpen] = useState(false);
  const { isOpen: shortcutsOpen, setOpen: setShortcutsOpen } =
    useShortcutsStore();

  // Use the page title hook
  usePageTitle();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === "?" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setShortcutsOpen]);

  return (
    <div className="relative flex min-h-screen bg-[#1A1D1E]">
      <SessionProvider>
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
              <main className="relative min-w-0 flex-1">
                <NotificationProvider>{children}</NotificationProvider>
              </main>
              <AIChatOverlay
                open={chatOverlayOpen}
                onOpenChange={setChatOverlayOpen}
              />
              <AIActionCursor />
              <Toaster />
            </TooltipProvider>
          </DndProvider>
        </PrivacyProvider>
      </SessionProvider>
    </div>
  );
}
