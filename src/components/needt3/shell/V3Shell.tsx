"use client";

import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { ComposerHost } from "../composer/Composer";
import { CtxLayer } from "../ctx/CtxLayer";
import { V3PortalScope } from "../ctx/PortalScope";
import { registerCtx } from "../ctx/registry";
import { CommandPalette } from "../palette/CommandPalette";
import { CustomizeSidebar } from "./CustomizeSidebar";
import { KeySheet } from "./KeySheet";
import { type ShellApi, ShellContext } from "./ShellContext";
import { Sidebar } from "./Sidebar";
import { WhatsNew } from "./TopIcons";
import { Topbar } from "./Topbar";
import {
  type KeyState,
  type ShellShortcut,
  isTypingTarget,
  nextTheme,
  resolveKey,
} from "./keys";

/** Below this width the rail steps out of the row and floats over the page. */
export const SB_NARROW = 1100;

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SB_NARROW - 0.02}px)`);
    const read = () => setNarrow(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return narrow;
}

/**
 * The desktop frame (prototype App.jsx layout): the top bar across the
 * window, the rail, and the page. Wide, the rail is a column that hides to
 * width 0 (⌘\, remembered); narrow (< 1100) it floats over the page and
 * every navigation puts it away. Focus Mode (⌘.) hides rail and top bar.
 * Mounted inside V3Root, so every portal stays in the `.needt-v3` scope.
 */
export function V3Shell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const narrow = useNarrow();
  const sidebarOpen = useNeedt3Ui((s) => s.sidebarOpen);
  const paletteOpen = useNeedt3Ui((s) => s.paletteOpen);
  const [float, setFloat] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const keyState = useRef<KeyState>({ lead: "", leadAt: 0 });

  // Entering or leaving the narrow width starts with the float closed.
  useEffect(() => setFloat(false), [narrow]);
  // Choosing a place from the floating rail is the end of its errand.
  useEffect(() => setFloat(false), [pathname]);

  const toggleSidebar = useCallback(() => {
    if (focusMode) {
      setFocusMode(false);
      useNeedt3Ui.getState().setSidebarOpen(true);
      setFloat(narrow);
      return;
    }
    if (narrow) setFloat((o) => !o);
    else useNeedt3Ui.getState().toggleSidebar();
  }, [focusMode, narrow]);

  const api: ShellApi = useMemo(
    () => ({
      narrow,
      focusMode,
      toggleSidebar,
      setFocusMode,
      openCustomize: () => setCustomize(true),
      openKeys: () => setKeysOpen(true),
      openWhatsNew: () => setNewsOpen(true),
    }),
    [narrow, focusMode, toggleSidebar]
  );

  /* The app menu: what a right-click on anything unmarked offers. */
  useEffect(
    () =>
      registerCtx("app", () => [
        [
          {
            label: "New Task",
            hint: "N",
            run: () => useNeedt3Ui.getState().setComposerOpen(true),
          },
        ],
        [
          {
            label: "Search",
            hint: "⌘K",
            run: () => useNeedt3Ui.getState().setPaletteOpen(true),
          },
          { label: "Toggle Sidebar", hint: "⌘\\", run: toggleSidebar },
        ],
        [
          {
            label: "Settings",
            hint: "⌘,",
            run: () => useNeedt3Ui.getState().openSettings(),
          },
        ],
      ]),
    [toggleSidebar]
  );

  useEffect(() => {
    const run = (s: ShellShortcut) => {
      const ui = useNeedt3Ui.getState();
      if (s.href) return router.push(s.href);
      switch (s.action) {
        case "palette":
          return ui.setPaletteOpen(true);
        case "composer":
          return ui.setComposerOpen(true);
        case "focus":
          return ui.setFocusOpen(!ui.focusOpen);
        case "plan":
          return router.push("/today");
        case "sidebar":
          return toggleSidebar();
        case "focusMode":
          return setFocusMode((f) => !f);
        case "settings":
          return ui.openSettings();
        case "ask":
          return ui.setAskOpen(!ui.askOpen);
        case "keyboard":
          return setKeysOpen(true);
        case "theme":
          return ui.setTheme(nextTheme(ui.theme));
        case "close":
          setFloat(false);
          setFocusMode(false);
          return undefined;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      // A dialog or menu that is open takes its own keys (Esc, arrows).
      if (e.defaultPrevented) return;
      const r = resolveKey(
        e,
        isTypingTarget(e.target),
        keyState.current,
        performance.now()
      );
      keyState.current = r.state;
      if (r.kind !== "run") return;
      if (r.shortcut.action === "close") {
        // Esc closes one thing: an open sheet or menu (it lives in the
        // portal layer) goes first, the floating rail and Focus Mode after.
        const layer = document.querySelector("[data-v3-portals]");
        if (!layer?.childElementCount) run(r.shortcut);
        return;
      }
      if (e.repeat) return;
      e.preventDefault();
      run(r.shortcut);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, toggleSidebar]);

  const hidden = !sidebarOpen || focusMode;
  const floatOpen = float && !focusMode;
  const ease = "cubic-bezier(.2,.8,.2,1)";

  return (
    <ShellContext.Provider value={api}>
      <div
        className="app theme-surface theme-drifts"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <V3PortalScope>
          {focusMode ? null : <Topbar />}
          <div className="shell-app-row">
            {narrow && floatOpen ? (
              <div
                className="sb-float-scrim"
                aria-hidden="true"
                onMouseDown={() => setFloat(false)}
              />
            ) : null}
            {narrow ? (
              <div
                className={`shell-app-layer sb-shell sb-float${floatOpen ? " is-open" : ""}`}
                aria-hidden={!floatOpen}
                inert={!floatOpen || undefined}
                style={{
                  boxShadow: floatOpen ? "var(--shadow-floating)" : "none",
                  transform: floatOpen
                    ? "none"
                    : "translateX(calc(-100% - 24px))",
                  pointerEvents: floatOpen ? "auto" : "none",
                  visibility: floatOpen ? "visible" : "hidden",
                  transition: floatOpen
                    ? "transform 260ms cubic-bezier(0.2, 0.9, 0.24, 1), box-shadow 260ms ease, visibility 0s"
                    : "transform 260ms cubic-bezier(0.2, 0.9, 0.24, 1), box-shadow 260ms ease, visibility 0s linear 260ms",
                }}
              >
                <div className="sb-swap shell-app-swap">
                  <Sidebar />
                </div>
              </div>
            ) : (
              /* Hide/show: the column's width runs 300 → 0 and the page
                 reflows, while the rail inside fades and slides 12px left. */
              <div
                className={`shell-app-row-2 sb-shell${hidden ? " is-hidden" : ""}`}
                aria-hidden={hidden || undefined}
                inert={hidden || undefined}
                style={{ width: hidden ? 0 : "var(--sidebar-w)" }}
              >
                <div
                  className="sb-rail shell-app-rail"
                  style={{
                    opacity: hidden ? 0 : 1,
                    transform: hidden ? "translateX(-12px)" : "none",
                    pointerEvents: hidden ? "none" : "auto",
                    transition: hidden
                      ? `opacity 180ms ease, transform 260ms ${ease}`
                      : `opacity 220ms ease 40ms, transform 260ms ${ease}`,
                  }}
                >
                  <div className="sb-swap shell-app-swap">
                    <Sidebar />
                  </div>
                </div>
              </div>
            )}
            {focusMode ? (
              <button
                type="button"
                className="focus-exit nx-press shell-app-focus-exit"
                onClick={() => setFocusMode(false)}
              >
                Exit Focus Mode<span className="base-meta-muted">esc</span>
              </button>
            ) : null}
            <main
              className="shell-app-stack"
              style={{ padding: focusMode ? "20px" : "0 20px 20px" }}
            >
              {/* Keyed by place, so moving between two docs keeps the page. */}
              <div
                key={pathname?.split("/")[1] ?? ""}
                className="screen-enter shell-app-screen-enter"
              >
                {children}
              </div>
            </main>
          </div>
          <CtxLayer />
          <CustomizeSidebar
            open={customize}
            onClose={() => setCustomize(false)}
          />
          <KeySheet open={keysOpen} onClose={() => setKeysOpen(false)} />
          <WhatsNew open={newsOpen} onClose={() => setNewsOpen(false)} />
          <CommandPalette
            open={paletteOpen}
            onClose={() => useNeedt3Ui.getState().setPaletteOpen(false)}
          />
          <ComposerHost />
        </V3PortalScope>
      </div>
    </ShellContext.Provider>
  );
}
