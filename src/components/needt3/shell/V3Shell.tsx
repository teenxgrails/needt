"use client";

import { type PropsWithChildren, useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { V3PortalScope } from "../ctx/PortalScope";
import { CommandPalette } from "../palette/CommandPalette";
import { KeySheet } from "./KeySheet";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SHELL_SHORTCUTS, isTypingTarget, shortcutForSequence } from "./keys";

/** S1 mounts this inside V3Root only after design_v3 is authorized on the server. */
export function V3Shell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const sidebarOpen = useNeedt3Ui((state) => state.sidebarOpen);
  const paletteOpen = useNeedt3Ui((state) => state.paletteOpen);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [floatOpen, setFloatOpen] = useState(false);
  const sequence = useRef({ value: "", at: 0 });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const read = () => setNarrow(media.matches);
    read();
    media.addEventListener("change", read);
    return () => media.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    setFloatOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      const typing = isTypingTarget(event.target);
      const state = useNeedt3Ui.getState();
      const run = (action: string) => {
        if (action === "palette") state.setPaletteOpen(!state.paletteOpen);
        else if (action === "composer") state.setComposerOpen(true);
        else if (action === "sidebar") {
          if (narrow) setFloatOpen((value) => !value);
          else state.toggleSidebar();
        } else if (action === "settings") state.openSettings();
        else if (action === "ask") state.setAskOpen(!state.askOpen);
        else if (action === "keyboard") setKeyboardOpen(true);
        else if (action === "close") {
          state.setPaletteOpen(false);
          setKeyboardOpen(false);
          setFloatOpen(false);
        }
      };
      const shortcut = SHELL_SHORTCUTS.find((row) => row.match?.(event));
      if (
        shortcut &&
        (!typing || event.metaKey || event.ctrlKey || event.key === "Escape")
      ) {
        event.preventDefault();
        sequence.current.value = "";
        if (shortcut.action) run(shortcut.action);
        return;
      }
      if (
        typing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        paletteOpen ||
        keyboardOpen
      ) {
        sequence.current.value = "";
        return;
      }
      const now = performance.now();
      const pending =
        now - sequence.current.at < 1000 ? sequence.current.value : "";
      const next = `${pending}${event.key.toLowerCase()}`;
      const route = shortcutForSequence(next);
      sequence.current = {
        value: event.key.toLowerCase() === "g" ? "g" : "",
        at: now,
      };
      if (route) {
        event.preventDefault();
        if (route.href) router.push(route.href);
        else if (route.action) run(route.action);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [router, narrow, paletteOpen, keyboardOpen]);

  return (
    <V3PortalScope>
      <Topbar
        onKeyboard={() => setKeyboardOpen(true)}
        onSidebar={() => {
          if (narrow) setFloatOpen((value) => !value);
          else useNeedt3Ui.getState().toggleSidebar();
        }}
      />
      <div className="shell-app-row">
        {narrow ? (
          <>
            {floatOpen && (
              <button
                aria-label="Close sidebar"
                className="sb-float-scrim"
                onClick={() => setFloatOpen(false)}
              />
            )}
            {floatOpen && (
              <div className="shell-app-layer sb-shell sb-float is-open">
                <Sidebar />
              </div>
            )}
          </>
        ) : (
          sidebarOpen && (
            <div className="shell-app-rail">
              <Sidebar />
            </div>
          )
        )}
        <main className="shell-app-stack">{children}</main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => useNeedt3Ui.getState().setPaletteOpen(false)}
      />
      <KeySheet open={keyboardOpen} onClose={() => setKeyboardOpen(false)} />
    </V3PortalScope>
  );
}
