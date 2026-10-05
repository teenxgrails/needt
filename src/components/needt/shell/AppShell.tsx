"use client";

/* THE SHELL — rail, tabs, screen switch, keyboard, focus session.
 *
 * WHERE WE ARE IS READ FROM A REF. PORT.md §8's React rule: a `goScreen` that
 * compares against the `screen` of the render that created it early-returns on
 * a screen you have already left, and the defect returns every time someone
 * forgets a dependency array. `at` is the truth; `screen` is what is painted.
 *
 * THE VEIL IS FOR LOADING, NOT FOR NAVIGATION. A screen this window has never
 * built gets covered while it builds; a screen already warm switches instantly,
 * because covering a swap that takes no time only adds delay.
 *
 * Settings takes the whole window. It is a place you go to, not a screen you
 * work beside, and the rail would only offer ways to leave it.
 *
 * The corner, the agent cursor, the composer and the palette are SLOTS. None
 * of those subsystems is built here; a stub that pretends would be worse than
 * an empty corner.
 */
import * as React from "react";

import type { IconType } from "react-icons";
import {
  LuCalendarDays,
  LuFileText,
  LuFolderKanban,
  LuHouse,
  LuSettings,
} from "react-icons/lu";

import { ExposureWordmark as Wordmark } from "@/components/needt/wordmark";

import { startOfDay } from "@/lib/date-utils";
import { isOverdue, parseDueDate } from "@/lib/needt/derive";
import type { NeedtPerson, NeedtTask } from "@/lib/needt/types";

import type { FocusSession } from "./FocusControl";
import { KeySheet } from "./KeySheet";
import { ScreenFrame } from "./ScreenFrame";
import { type PinnedDoc, type ShellAccount, Sidebar } from "./Sidebar";
import { TabRail } from "./TabRail";
import { type NeedtScreenId } from "./screens";
import { useNeedtKeys } from "./useNeedtKeys";

const SCREEN_GLYPHS: Record<NeedtScreenId, IconType> = {
  today: LuHouse,
  workspace: LuFolderKanban,
  calendar: LuCalendarDays,
  docs: LuFileText,
  settings: LuSettings,
};

/** A surface the shell hands its open/closed state to. */
export type ShellOverlay = (props: {
  open: boolean;
  onClose: () => void;
}) => React.ReactNode;

export interface AppShellProps {
  today: Date;
  tasks: readonly NeedtTask[];
  people: readonly NeedtPerson[];
  pinned: readonly PinnedDoc[];
  account: ShellAccount;
  /** A dark ground wants a quieter edge on every raised object. */
  dark: boolean;
  /** ⌘⇧L. The picker owns the list; the shell only asks for the next one. */
  onCycleTheme: () => void;

  /* ── SLOTS ─────────────────────────────────────────────────────────────
     Subsystems that are not built here. */

  /**
   * The chat pill, island and panel, and the notification stack —
   * `src/components/needt/corner/**`, built concurrently. It renders inside
   * the main pane, which is the positioned ancestor `.nf-stack` and the chat
   * shell measure their corner from.
   */
  /**
   * The real screens, by id. A screen that is not supplied falls through to
   * `ScreenFrame`'s own statement of its absence, which is why this is partial:
   * a frame saying what is missing is honest, and a blank pane is not.
   */
  screenSlots?: Partial<Record<NeedtScreenId, React.ReactNode>>;
  /**
   * Which screen is showing, when something outside owns that.
   *
   * Mounted in the app, the URL decides, so the shell follows `pathname`
   * rather than holding its own state — otherwise the rail and the address
   * bar can disagree, and a deep link lands on the wrong screen. Left out,
   * the shell owns the switch as before, which is what the design preview
   * and the tests use.
   */
  screen?: NeedtScreenId;
  /** Called instead of switching internally, when `screen` is supplied. */
  onScreen?: (next: NeedtScreenId) => void;
  /**
   * The page itself. Each ported route already draws its own `ScreenFrame`,
   * so when children are given the shell renders them directly rather than
   * framing them a second time.
   */
  children?: React.ReactNode;
  /** Off when the host app already binds ⌘K and ?. */
  bindKeys?: boolean;
  cornerSlot?: React.ReactNode;
  /** The app's own hand: over everything, clickable through. */
  agentCursorSlot?: React.ReactNode;
  /** ⌘N and New. The one-line parser is not ported yet. */
  composerSlot?: ShellOverlay;
  /** ⌘K. */
  commandPaletteSlot?: ShellOverlay;
  /**
   * Where the rail's search bar goes when the host already ships a command
   * palette of its own. Supplied, the shell hands the press over and never
   * opens `commandPaletteSlot`; left out, it opens its own — which is what
   * the design preview does.
   */
  onOpenPalette?: () => void;
  /**
   * ⌘⇧P. PORT.md §9: "Plan my day" plays a placement, it does not solve one.
   * Real placement belongs to `src/services/scheduling/`, so the shell only
   * reports the press.
   */
  onPlan?: () => void;
  /**
   * Opening a task. The task editor is not ported, so a caller that has no
   * editor leaves this out and a row in the rail is inert rather than lying.
   */
  onOpenTask?: (task: NeedtTask) => void;
  /**
   * How fast a focus session's clock runs, in ms per second of session. The
   * real clock is 1000. The preview runs it faster so the ring and the fill
   * can be judged without waiting out fifty real minutes.
   */
  focusTickMs?: number;
  /**
   * A session the host already owns, server-side and durable. Left out, the
   * shell runs one of its own in memory — which is what the design preview
   * wants and what a real application must not have, because a timer that
   * only exists in this tab is a timer the rest of the product cannot see.
   */
  focus?: FocusSession | null;
  onStartFocus?: (session: Omit<FocusSession, "elapsed">) => void;
  onStopFocus?: () => void;
  /** See `FocusControl` — only a host with a real session has one. */
  focusExitIn?: number | null;
}

export function AppShell({
  today,
  tasks,
  people,
  pinned,
  account,
  dark,
  onCycleTheme,
  screenSlots,
  screen: screenProp,
  onScreen,
  children,
  bindKeys = true,
  cornerSlot,
  agentCursorSlot,
  composerSlot,
  commandPaletteSlot,
  onOpenPalette,
  onPlan,
  onOpenTask,
  focusTickMs = 1000,
  focus: focusProp,
  onStartFocus,
  onStopFocus,
  focusExitIn,
}: AppShellProps) {
  const [ownScreen, setScreen] = React.useState<NeedtScreenId>("today");
  const controlled = screenProp !== undefined;
  const screen = screenProp ?? ownScreen;
  const [routing, setRouting] = React.useState<NeedtScreenId | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date>(() =>
    startOfDay(today)
  );
  const [ownFocus, setOwnFocus] = React.useState<FocusSession | null>(null);
  const focusControlled = focusProp !== undefined;
  const focus = focusControlled ? focusProp : ownFocus;
  const [keysOpen, setKeysOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);

  /* Where we are, and what has been built. Both refs: neither is painted, and
     a closure over either is the bug §8 names. */
  const at = React.useRef<NeedtScreenId>(screen);
  at.current = screen;
  /* ⌘⇧F toggles, and the listener is registered once — it must not answer
     with the session of the render that made it. */
  const atFocus = React.useRef<boolean>(focus !== null);
  atFocus.current = focus !== null;
  const built = React.useRef<Partial<Record<NeedtScreenId, true>>>({
    today: true,
  });

  const goScreen = React.useCallback(
    (next: NeedtScreenId) => {
      if (next === at.current) return;
      at.current = next;
      if (controlled) {
        /* The router owns the swap, and it paints the new screen itself; a
           veil here would only cover a transition that already happened. */
        onScreen?.(next);
        return;
      }
      if (built.current[next]) {
        setScreen(next);
        return;
      }
      built.current[next] = true;
      setRouting(next);
      window.setTimeout(() => setScreen(next), 240);
      window.setTimeout(() => setRouting(null), 560);
    },
    [controlled, onScreen]
  );

  const startFocus = React.useCallback(
    (session: Omit<FocusSession, "elapsed">) => {
      if (focusControlled) {
        onStartFocus?.(session);
        return;
      }
      setOwnFocus({ ...session, elapsed: 0 });
    },
    [focusControlled, onStartFocus]
  );

  const stopFocus = React.useCallback(() => {
    if (focusControlled) {
      onStopFocus?.();
      return;
    }
    setOwnFocus(null);
  }, [focusControlled, onStopFocus]);

  /* A session ticks one second at a time. `focusTickMs` only changes how long
     a second takes on the wall clock. A controlled session is the host's to
     count: it has a server-side start time, and a second clock running beside
     it would only drift away from it. */
  React.useEffect(() => {
    if (focusControlled || !focus) return undefined;
    const id = window.setInterval(() => {
      setOwnFocus((live) =>
        live && live.elapsed < live.planned * 60
          ? { ...live, elapsed: live.elapsed + 1 }
          : live
      );
    }, focusTickMs);
    return () => window.clearInterval(id);
  }, [focus, focusControlled, focusTickMs]);

  /* Escape closes ONE thing, the one in front. Read through a ref for the
     same reason `at` is a ref: the listener is registered once and must not
     answer with the state of the render that made it. */
  const overlays = React.useRef({
    keys: false,
    composer: false,
    palette: false,
  });
  overlays.current = {
    keys: keysOpen,
    composer: composerOpen,
    palette: paletteOpen,
  };

  const closeTop = React.useCallback(() => {
    const { keys, composer, palette } = overlays.current;
    if (keys) setKeysOpen(false);
    else if (composer) setComposerOpen(false);
    else if (palette) setPaletteOpen(false);
  }, []);

  useNeedtKeys(
    React.useCallback(
      (action) => {
        switch (action.kind) {
          case "palette":
            if (onOpenPalette) onOpenPalette();
            else setPaletteOpen(true);
            return;
          case "new":
            setComposerOpen(true);
            return;
          case "focus":
            if (atFocus.current) stopFocus();
            else startFocus({ intention: "", planned: 50, taskId: null });
            return;
          case "plan":
            onPlan?.();
            return;
          case "theme":
            onCycleTheme();
            return;
          case "sheet":
            setKeysOpen(true);
            return;
          case "close":
            closeTop();
            return;
          case "go":
            goScreen(action.screen);
            return;
        }
      },
      [
        closeTop,
        goScreen,
        onCycleTheme,
        onOpenPalette,
        onPlan,
        startFocus,
        stopFocus,
      ]
    ),
    bindKeys
  );

  const dueToday = React.useMemo(() => {
    const key = startOfDay(today).getTime();
    return tasks.filter((task) => {
      if (task.done || task.noSlot) return false;
      if (isOverdue(task, today)) return true;
      const due = parseDueDate(task.due, today);
      return due !== null && startOfDay(due).getTime() === key;
    }).length;
  }, [tasks, today]);

  const settings = screen === "settings";

  return (
    <div
      className="flex"
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
      }}
    >
      {settings ? null : (
        <div className="hidden lg:contents">
          <Sidebar
            today={today}
            tasks={tasks}
            people={people}
            pinned={pinned}
            account={account}
            screen={screen}
            onScreen={goScreen}
            onOpenPalette={onOpenPalette ?? (() => setPaletteOpen(true))}
            onOpenTask={onOpenTask}
            onOpenKeys={() => setKeysOpen(true)}
            onSignOut={() => goScreen("settings")}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            focus={focus}
            onStartFocus={startFocus}
            onStopFocus={stopFocus}
            focusExitIn={focusExitIn}
            dark={dark}
          />
        </div>
      )}

      {/* The corners breathe in the accent while a session runs. It never
          takes a pointer event. */}
      {focus ? <div className="focus-aura" aria-hidden="true" /> : null}
      {agentCursorSlot}

      <main
        className="flex flex-col"
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          padding: "0 20px 20px",
          backgroundColor: "var(--background)",
          backgroundImage: "var(--canvas-veil)",
          boxShadow: settings ? "none" : "var(--border) 1px 0 0 0 inset",
          overflow: "hidden",
        }}
      >
        {settings ? null : (
          <div className="hidden lg:contents">
            <TabRail
              screen={screen}
              onScreen={goScreen}
              onNew={() => setComposerOpen(true)}
              dueToday={dueToday}
            />
          </div>
        )}

        {/* Keyed on the screen so the entrance replays on every swap, which is
            what `.screen-enter` and its per-child stagger are for. */}
        <div
          key={screen}
          className="screen-enter flex flex-col"
          style={{
            flex: 1,
            minHeight: 0,
          }}
        >
          {children ?? (
            <ScreenFrame
              id={screen}
              glyph={SCREEN_GLYPHS[screen]}
              actions={
                settings ? (
                  <button
                    type="button"
                    className="btn btn-flat"
                    onClick={() => goScreen("today")}
                  >
                    Back
                  </button>
                ) : null
              }
            >
              {screenSlots?.[screen]}
            </ScreenFrame>
          )}
        </div>

        <KeySheet open={keysOpen} onClose={() => setKeysOpen(false)} />
        {commandPaletteSlot?.({
          open: paletteOpen,
          onClose: () => setPaletteOpen(false),
        })}
        {composerSlot?.({
          open: composerOpen,
          onClose: () => setComposerOpen(false),
        })}
        {cornerSlot}
        <RouteVeil to={routing} />
      </main>
    </div>
  );
}

/* THE VEIL — one moving mark over a settling ground. It owns its own exit: it
   holds the last route for the length of the fade so it can leave the way it
   arrived, instead of vanishing the instant the screen is ready. */
function RouteVeil({ to }: { to: NeedtScreenId | null }) {
  const [held, setHeld] = React.useState<NeedtScreenId | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (to) {
      setHeld(to);
      /* Two frames: one to mount at zero, one to start the transition. */
      let inner = 0;
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setShown(true));
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const id = window.setTimeout(() => setHeld(null), 280);
    return () => window.clearTimeout(id);
  }, [to]);

  if (!held) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 800,
        display: "grid",
        placeItems: "center",
        background: "var(--background)",
        opacity: shown ? 1 : 0,
        transition: "opacity 0.3s cubic-bezier(0.37, 0, 0.63, 1)",
        pointerEvents: "none",
      }}
    >
      <span
        className="veil-mark"
        style={{ position: "relative", display: "block" }}
      >
        <Wordmark size={46} />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -8,
            height: 1.5,
            overflow: "hidden",
          }}
        >
          <span className="veil-sweep" />
        </span>
      </span>
    </div>
  );
}
