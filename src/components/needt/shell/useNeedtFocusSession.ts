"use client";

/* THE RAIL'S FOCUS SESSION, on the server where the rest of the product can
 * see it.
 *
 * `AppShell` keeps a session in React state when nothing supplies one — which
 * is right for the design preview and wrong for the application: a timer that
 * exists only in this tab is invisible to `/focus`, to the session history, to
 * the stats, and to anything that later asks whether the person is heads-down.
 * It also disappears on reload. This hook puts the rail's control on
 * `/api/focus/session`, which already owns that lifecycle, so starting a
 * session from the rail and starting one from `/focus` are the same act.
 *
 * Timing is the server's. `startedAt` is the truth and `elapsed` is derived
 * from it on every tick, so a reload, a second tab, or a sleeping laptop all
 * resume on the same number rather than counting from wherever they woke up.
 */
import * as React from "react";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import type { FocusSession } from "./FocusControl";

const LOG_SOURCE = "useNeedtFocusSession";

/** The slice of `FocusSession` (the Prisma model) this control needs. */
interface ServerSession {
  id: string;
  taskId: string | null;
  intention: string | null;
  plannedMinutes: number | null;
  startedAt: string;
  pausedAt: string | null;
  pausedTotalSeconds: number;
}

/** The control shows a ring against a planned length, so a flow session with
 * no planned minutes still needs a number to draw against. */
const DEFAULT_PLANNED_MINUTES = 50;

function elapsedSeconds(session: ServerSession, now: Date): number {
  const ran = (now.getTime() - newDate(session.startedAt).getTime()) / 1000;
  const paused =
    session.pausedTotalSeconds +
    (session.pausedAt
      ? (now.getTime() - newDate(session.pausedAt).getTime()) / 1000
      : 0);
  return Math.max(0, Math.floor(ran - paused));
}

function toShellSession(session: ServerSession, now: Date): FocusSession {
  return {
    intention: session.intention ?? "",
    planned: session.plannedMinutes ?? DEFAULT_PLANNED_MINUTES,
    elapsed: elapsedSeconds(session, now),
    taskId: session.taskId,
  };
}

export interface NeedtFocusSession {
  /** `null` while idle, and while the first read is still in flight — the
   * rail's resting state is the honest one to show before we know. */
  focus: FocusSession | null;
  start: (session: Omit<FocusSession, "elapsed">) => void;
  /**
   * Ending early takes two presses, because the product asks you to wait a
   * few seconds and reconsider. The first press asks; the second, once
   * `exitIn` has reached zero, ends it. A session that has run its planned
   * length ends on the first press — there is nothing left to reconsider.
   */
  stop: () => void;
  /** Seconds left on that wait, or `null` when none was asked for. */
  exitIn: number | null;
}

export function useNeedtFocusSession(enabled: boolean): NeedtFocusSession {
  const [server, setServer] = React.useState<ServerSession | null>(null);
  const [tick, setTick] = React.useState(0);
  /** When the early exit becomes allowed, as epoch ms. */
  const [exitReadyAt, setExitReadyAt] = React.useState<number | null>(null);

  const read = React.useCallback(async () => {
    try {
      const response = await fetch("/api/focus/session", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        active?: boolean;
        session?: ServerSession | null;
      };
      const live = body.active && body.session ? body.session : null;
      setServer(live);
      if (!live) setExitReadyAt(null);
    } catch (error) {
      void logger.debug(
        "Focus session is unavailable to the rail",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) return undefined;
    void read();
    return undefined;
  }, [enabled, read]);

  /* One second at a time, and only while something is running. The exit
     countdown runs on the same tick: it is the same clock. */
  React.useEffect(() => {
    if (!server || (server.pausedAt && exitReadyAt === null)) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [exitReadyAt, server]);

  /** A lifecycle call whose reply the caller needs, rather than one it only
   * has to re-read after. */
  const ask = React.useCallback(
    async (body: Record<string, unknown>): Promise<unknown | null> => {
      try {
        const response = await fetch("/api/focus/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          void logger.warn(
            "Focus session action was refused",
            { action: String(body.action), status: response.status },
            LOG_SOURCE
          );
          return null;
        }
        return result;
      } catch (error) {
        void logger.error(
          "Focus session action failed",
          { error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
        return null;
      }
    },
    []
  );

  const act = React.useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const response = await fetch("/api/focus/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          void logger.warn(
            "Focus session action was refused",
            { action: String(body.action), status: response.status },
            LOG_SOURCE
          );
        }
      } catch (error) {
        void logger.error(
          "Focus session action failed",
          { error: error instanceof Error ? error.message : String(error) },
          LOG_SOURCE
        );
      }
      /* Re-read rather than trust the reply: the server may have refused the
         start (an advanced mode the plan does not carry, a session already
         running), and the rail must show what is actually true. */
      await read();
    },
    [read]
  );

  const start = React.useCallback(
    (session: Omit<FocusSession, "elapsed">) => {
      void act({
        action: "start",
        taskId: session.taskId,
        plannedMinutes: session.planned,
        intention: session.intention || null,
        mode: "POMODORO",
        source: "shell",
      });
    },
    [act]
  );

  const stop = React.useCallback(() => {
    const live = server;
    if (!live) return;

    /* A session that has run its planned length is finished, not abandoned,
       and the server lets that one go without a wait. */
    const planned = live.plannedMinutes;
    const done =
      planned != null && elapsedSeconds(live, newDate()) >= planned * 60;
    if (done) {
      setExitReadyAt(null);
      void act({ action: "stop", sessionId: live.id, completed: true });
      return;
    }

    if (exitReadyAt === null) {
      void (async () => {
        const result = await ask({ action: "request-stop", sessionId: live.id });
        if (!result) return;
        const readyAt = (result as { readyAt?: string }).readyAt;
        const waitSeconds = (result as { waitSeconds?: number }).waitSeconds;
        setExitReadyAt(
          readyAt
            ? newDate(readyAt).getTime()
            : Date.now() + (waitSeconds ?? 5) * 1000
        );
      })();
      return;
    }

    if (Date.now() < exitReadyAt) return;
    setExitReadyAt(null);
    void act({ action: "stop", sessionId: live.id, completed: false });
  }, [act, ask, exitReadyAt, server]);

  const exitIn = React.useMemo(() => {
    if (exitReadyAt === null) return null;
    void tick;
    return Math.max(0, Math.ceil((exitReadyAt - Date.now()) / 1000));
  }, [exitReadyAt, tick]);

  const focus = React.useMemo(
    () => (server ? toShellSession(server, newDate()) : null),
    /* `tick` is the clock: it carries no value, it only says a second has
       passed and the derived `elapsed` is now one higher. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server, tick]
  );

  return { focus, start, stop, exitIn };
}
