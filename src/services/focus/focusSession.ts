import { recomputeTaskActuals } from "@/services/time-tracking/timeEntries";
import {
  FocusSession,
  FocusSessionMode,
  FocusSessionPhase,
  FocusStrictnessMode,
  TimeEntrySource,
} from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { focusedMinutes, projectedEndsAt } from "@/lib/focus-timer";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { TaskStatus } from "@/types/task";

import { recomputeFocusStats } from "./focusStats";

const LOG_SOURCE = "focusSession";
const EXIT_DELAYS_SECONDS = [5, 10, 20] as const;

export class FocusExitError extends Error {
  constructor(
    public readonly code: "EXIT_DELAY_REQUIRED" | "EXIT_DELAY_ACTIVE" | "DEEP_FOCUS_LOCKED",
    public readonly retryAfter?: number
  ) {
    super(code);
    this.name = "FocusExitError";
  }
}

export class ActiveFocusSessionError extends Error {
  constructor() {
    super("ACTIVE_FOCUS_SESSION");
    this.name = "ActiveFocusSessionError";
  }
}

/**
 * The active session is the single FocusSession for a user with endedAt = null.
 * Server-side lifecycle: start -> (pause/resume)* -> stop. The client never
 * owns timing; it renders from these persisted fields via `@/lib/focus-timer`.
 */
export async function getActiveSession(
  userId: string
): Promise<FocusSession | null> {
  return prisma.focusSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

export async function startSession(input: {
  userId: string;
  taskId?: string | null;
  mode: FocusSessionMode;
  plannedMinutes?: number | null;
  source?: string;
  phase?: FocusSessionPhase;
  strictness?: FocusStrictnessMode;
  intention?: string | null;
}): Promise<FocusSession> {
  const existing = await getActiveSession(input.userId);
  if (existing) {
    throw new ActiveFocusSessionError();
  }

  const session = await prisma.focusSession.create({
    data: {
      userId: input.userId,
      taskId: input.taskId || null,
      mode: input.mode,
      plannedMinutes: input.plannedMinutes ?? null,
      elapsedMinutes: 0,
      startedAt: newDate(),
      source: input.source || "web",
      phase: input.phase ?? FocusSessionPhase.FOCUS,
      strictness: input.strictness ?? FocusStrictnessMode.NORMAL,
      intention: input.intention?.trim() || null,
    },
  });

  logger.info(
    "Started focus session",
    { sessionId: session.id, mode: session.mode },
    LOG_SOURCE
  );
  return session;
}

export async function pauseSession(
  userId: string,
  sessionId: string
): Promise<FocusSession | null> {
  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId, endedAt: null },
  });
  if (!session || session.pausedAt) return session;

  return prisma.focusSession.update({
    where: { id: session.id },
    data: { pausedAt: newDate() },
  });
}

export async function resumeSession(
  userId: string,
  sessionId: string
): Promise<FocusSession | null> {
  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId, endedAt: null },
  });
  if (!session || !session.pausedAt) return session;

  const pausedSeconds = Math.max(
    0,
    Math.floor((newDate().getTime() - session.pausedAt.getTime()) / 1000)
  );

  return prisma.focusSession.update({
    where: { id: session.id },
    data: {
      pausedAt: null,
      pausedTotalSeconds: session.pausedTotalSeconds + pausedSeconds,
    },
  });
}

export async function extendSession(
  userId: string,
  sessionId: string,
  minutes: number
) {
  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId, endedAt: null },
  });
  if (!session) return null;
  return prisma.focusSession.update({
    where: { id: session.id },
    data: {
      plannedMinutes: (session.plannedMinutes ?? 0) + Math.max(1, minutes),
    },
  });
}

export async function requestEarlyExit(userId: string, sessionId: string) {
  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId, endedAt: null },
  });
  if (!session) return null;
  if (session.strictness === FocusStrictnessMode.DEEP_FOCUS) {
    throw new FocusExitError("DEEP_FOCUS_LOCKED");
  }
  const attempt = Math.min(
    session.exitAttemptCount,
    EXIT_DELAYS_SECONDS.length - 1
  );
  const waitSeconds =
    session.strictness === FocusStrictnessMode.NORMAL
      ? EXIT_DELAYS_SECONDS[0]
      : EXIT_DELAYS_SECONDS[attempt];
  const requestedAt = newDate();
  const updated = await prisma.focusSession.update({
    where: { id: session.id },
    data: {
      stopRequestedAt: requestedAt,
      exitAttemptCount: { increment: 1 },
    },
  });
  return {
    session: updated,
    waitSeconds,
    readyAt: new Date(requestedAt.getTime() + waitSeconds * 1000),
  };
}

/**
 * Finalize (stop) a session: write endedAt, the focused minutes, and the
 * completed/abandoned outcome. On a completed, task-bound session we also log a
 * TimeEntry, roll the task's actual minutes, and bump `actualFocusedMinutes`.
 * Optionally marks the bound task done.
 */
export async function finalizeSession(input: {
  userId: string;
  sessionId: string;
  completed: boolean;
  markTaskDone?: boolean;
}): Promise<FocusSession | null> {
  const session = await prisma.focusSession.findFirst({
    where: { id: input.sessionId, userId: input.userId, endedAt: null },
  });
  if (!session) return null;

  if (!input.completed) {
    if (session.strictness === FocusStrictnessMode.DEEP_FOCUS) {
      throw new FocusExitError("DEEP_FOCUS_LOCKED");
    }
    if (!session.stopRequestedAt) {
      throw new FocusExitError("EXIT_DELAY_REQUIRED");
    }
    const delayIndex = Math.max(
      0,
      Math.min(session.exitAttemptCount - 1, EXIT_DELAYS_SECONDS.length - 1)
    );
    const delaySeconds =
      session.strictness === FocusStrictnessMode.NORMAL
        ? EXIT_DELAYS_SECONDS[0]
        : EXIT_DELAYS_SECONDS[delayIndex];
    const remaining = Math.ceil(
      (session.stopRequestedAt.getTime() +
        delaySeconds * 1000 -
        newDate().getTime()) /
        1000
    );
    if (remaining > 0) {
      throw new FocusExitError("EXIT_DELAY_ACTIVE", remaining);
    }
  }

  const endedAt = newDate();
  // Fold any in-progress pause into the total so focused minutes are accurate.
  const pausedTotalSeconds = session.pausedAt
    ? session.pausedTotalSeconds +
      Math.max(
        0,
        Math.floor((endedAt.getTime() - session.pausedAt.getTime()) / 1000)
      )
    : session.pausedTotalSeconds;

  const minutes = focusedMinutes(
    {
      startedAt: session.startedAt,
      plannedMinutes: session.plannedMinutes,
      pausedTotalSeconds,
      pausedAt: null,
    },
    endedAt
  );

  const finalized = await prisma.focusSession.update({
    where: { id: session.id },
    data: {
      endedAt,
      pausedAt: null,
      pausedTotalSeconds,
      elapsedMinutes: minutes,
      completed: input.completed,
      abandoned: !input.completed,
    },
  });

  if (session.taskId && input.completed && minutes > 0) {
    await prisma.timeEntry.create({
      data: {
        taskId: session.taskId,
        userId: input.userId,
        startedAt: session.startedAt,
        endedAt,
        source: TimeEntrySource.focus,
      },
    });
    await prisma.task.update({
      where: { id: session.taskId },
      data: { actualFocusedMinutes: { increment: minutes } },
    });
    await recomputeTaskActuals(session.taskId);
  }

  if (session.taskId && input.markTaskDone) {
    await prisma.task.update({
      where: { id: session.taskId },
      data: { status: TaskStatus.COMPLETED, completedAt: endedAt },
    });
  }

  await recomputeFocusStats(input.userId);

  logger.info(
    "Finalized focus session",
    { sessionId: session.id, completed: input.completed, minutes },
    LOG_SOURCE
  );
  return finalized;
}

/**
 * Lightweight active-session snapshot.
 *
 * GET /api/focus/active returns this shape ({ active, taskId, endsAt }). A
 * future Chrome extension will poll that endpoint to enforce website/app
 * blocking while a focus session is running, so keep the shape stable and
 * cheap. `endsAt` is null for a free/flow session (no fixed end) or when no
 * session is active.
 */
export function activeSummary(session: FocusSession | null): {
  active: boolean;
  taskId: string | null;
  endsAt: string | null;
} {
  if (!session) return { active: false, taskId: null, endsAt: null };
  const endsAt = projectedEndsAt(
    {
      startedAt: session.startedAt,
      plannedMinutes: session.plannedMinutes,
      pausedTotalSeconds: session.pausedTotalSeconds,
      pausedAt: session.pausedAt,
    },
    newDate()
  );
  return {
    active: true,
    taskId: session.taskId,
    endsAt: endsAt ? endsAt.toISOString() : null,
  };
}
