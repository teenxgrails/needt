export type SchedulingEnergyLevel = "LOW" | "MEDIUM" | "HIGH";
export type SchedulingTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SchedulableTask {
  id: string;
  title: string;
  status?: string;
  createdAt?: Date;
  estimatedMinutes?: number | null;
  durationMinutes?: number | null;
  minChunkMinutes?: number | null;
  maxChunkMinutes?: number | null;
  deadline?: Date | null;
  priority: SchedulingTaskPriority;
  energyRequired: SchedulingEnergyLevel;
  contextTag?: string | null;
  isFrozen?: boolean;
  dependsOnId?: string | null;
  autoScheduled?: boolean;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
}

export interface CalendarBusyBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: "calendar" | "task" | "frozen";
}

export interface EnergyProfileWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  energyLevel: SchedulingEnergyLevel;
}

export interface EnergyProfile {
  windows: EnergyProfileWindow[];
}

export interface WorkHoursWindow {
  start: string;
  end: string;
}

export interface SchedulingPreferences {
  workHours: Record<string, WorkHoursWindow>;
  bufferMinutes: number;
  maxDeepWorkPerDay: number;
  minBreakMinutes: number;
  autoRescheduleOnMiss: boolean;
  enableBodyDoubling: boolean;
  enableTaskBatching: boolean;
  hardStopTime: string;
  bufferMultiplier: number;
  calibrationFactors?: Record<string, number>;
}

export interface ScheduledBlock {
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  chunkIndex: number;
  chunkCount: number;
  energyRequired: SchedulingEnergyLevel;
  contextTag?: string | null;
  isFrozen: boolean;
}

export interface UnscheduledTask {
  taskId: string;
  title: string;
  reason: string;
}

export interface ScheduleResult {
  blocks: ScheduledBlock[];
  unscheduled: UnscheduledTask[];
  frozenBlocks: ScheduledBlock[];
}

interface OccupiedBlock {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

interface TaskChunk {
  task: SchedulableTask;
  minutes: number;
  bufferAfterMinutes: number;
  chunkIndex: number;
  chunkCount: number;
}

const DEFAULT_ESTIMATE_MINUTES = 30;
const DEFAULT_MIN_CHUNK_MINUTES = 25;
const DEFAULT_SEARCH_DAYS = 21;
const SLOT_STEP_MINUTES = 15;

const PRIORITY_WEIGHT: Record<SchedulingTaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function setTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function roundUpToStep(date: Date, stepMinutes = SLOT_STEP_MINUTES): Date {
  const stepMs = stepMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function isDone(task: SchedulableTask): boolean {
  return task.status === "completed";
}

function dayKey(date: Date): string {
  return String(date.getDay());
}

function getWorkWindow(
  date: Date,
  prefs: SchedulingPreferences
): { start: Date; end: Date } | null {
  const dayPrefs = prefs.workHours[dayKey(date)];
  if (!dayPrefs) {
    return null;
  }

  const start = setTime(date, dayPrefs.start);
  const workEnd = setTime(date, dayPrefs.end);
  const hardStop = setTime(date, prefs.hardStopTime);
  const end = workEnd < hardStop ? workEnd : hardStop;

  return start < end ? { start, end } : null;
}

function getEnergyWindowsForDay(
  date: Date,
  profile: EnergyProfile
): Array<{ start: Date; end: Date; energyLevel: SchedulingEnergyLevel }> {
  return profile.windows
    .filter((window) => window.dayOfWeek === date.getDay())
    .map((window) => ({
      start: setTime(date, window.startTime),
      end: setTime(date, window.endTime),
      energyLevel: window.energyLevel,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function energyMatches(
  required: SchedulingEnergyLevel,
  candidate: SchedulingEnergyLevel,
  strict: boolean
): boolean {
  if (!strict) {
    return true;
  }

  if (required === "HIGH") {
    return candidate === "HIGH";
  }

  if (required === "MEDIUM") {
    return candidate === "MEDIUM" || candidate === "HIGH";
  }

  return true;
}

function hasEnergyMatch(
  start: Date,
  end: Date,
  task: SchedulableTask,
  profile: EnergyProfile,
  strict: boolean
): boolean {
  if (!strict) {
    return true;
  }

  const windows = getEnergyWindowsForDay(start, profile);
  if (windows.length === 0) {
    return task.energyRequired !== "HIGH";
  }

  return windows.some(
    (window) =>
      start >= window.start &&
      end <= window.end &&
      energyMatches(task.energyRequired, window.energyLevel, strict)
  );
}

function hasConflict(
  start: Date,
  end: Date,
  occupied: OccupiedBlock[],
  spacingMinutes: number
): boolean {
  const spacedStart = addMinutes(start, -spacingMinutes);
  const spacedEnd = addMinutes(end, spacingMinutes);
  return occupied.some((block) =>
    overlaps(spacedStart, spacedEnd, block.start, block.end)
  );
}

function priorityScore(task: SchedulableTask, now: Date): number {
  const priority = PRIORITY_WEIGHT[task.priority] * 100_000;
  const deadline = task.deadline
    ? Math.max(
        0,
        30_000 - (task.deadline.getTime() - now.getTime()) / 3_600_000
      )
    : 0;
  const age = task.createdAt
    ? Math.max(
        0,
        Math.min(10_000, (now.getTime() - task.createdAt.getTime()) / 3_600_000)
      )
    : 0;

  return priority + deadline + age;
}

function sortTasks(tasks: SchedulableTask[], now: Date): SchedulableTask[] {
  return [...tasks].sort((a, b) => {
    if (a.dependsOnId === b.id) return 1;
    if (b.dependsOnId === a.id) return -1;

    const scoreDelta = priorityScore(b, now) - priorityScore(a, now);
    if (scoreDelta !== 0) return scoreDelta;

    if (a.contextTag && b.contextTag && a.contextTag !== b.contextTag) {
      return a.contextTag.localeCompare(b.contextTag);
    }

    return a.title.localeCompare(b.title);
  });
}

function splitTaskIntoChunks(
  task: SchedulableTask,
  prefs: SchedulingPreferences
): TaskChunk[] {
  const rawEstimate =
    task.estimatedMinutes ?? task.durationMinutes ?? DEFAULT_ESTIMATE_MINUTES;
  const contextFactor = task.contextTag
    ? prefs.calibrationFactors?.[task.contextTag.toLowerCase()]
    : undefined;
  const estimateFactor = Math.max(1, contextFactor ?? prefs.bufferMultiplier);
  const minChunk = Math.max(
    1,
    task.minChunkMinutes ?? DEFAULT_MIN_CHUNK_MINUTES
  );
  const maxChunk = Math.max(minChunk, task.maxChunkMinutes ?? rawEstimate);
  const chunks: number[] = [];
  let remaining = Math.max(1, rawEstimate);

  while (remaining > 0) {
    let chunk = Math.min(maxChunk, remaining);
    const leftover = remaining - chunk;

    if (leftover > 0 && leftover < minChunk) {
      chunk = Math.max(minChunk, remaining - minChunk);
    }

    chunks.push(chunk);
    remaining -= chunk;
  }

  return chunks.map((minutes, index) => ({
    task,
    minutes,
    bufferAfterMinutes: Math.max(0, Math.ceil(minutes * (estimateFactor - 1))),
    chunkIndex: index,
    chunkCount: chunks.length,
  }));
}

function findDependencyReadyAt(
  task: SchedulableTask,
  placedTaskEnds: Map<string, Date>,
  unscheduledTaskIds: Set<string>,
  now: Date
): Date | null {
  if (!task.dependsOnId) {
    return now;
  }

  if (unscheduledTaskIds.has(task.dependsOnId)) {
    return null;
  }

  return placedTaskEnds.get(task.dependsOnId) ?? now;
}

function findSlot(
  chunk: TaskChunk,
  occupied: OccupiedBlock[],
  profile: EnergyProfile,
  prefs: SchedulingPreferences,
  earliestStart: Date,
  deepWorkByDay: Map<string, number>,
  strictEnergy: boolean
): { start: Date; end: Date } | null {
  const spacingMinutes = Math.max(prefs.bufferMinutes, prefs.minBreakMinutes);
  const searchEnd = addMinutes(earliestStart, DEFAULT_SEARCH_DAYS * 24 * 60);
  let day = startOfDay(earliestStart);

  while (day <= searchEnd) {
    const work = getWorkWindow(day, prefs);
    if (work) {
      let cursor = roundUpToStep(
        earliestStart > work.start ? earliestStart : work.start
      );

      while (cursor < work.end) {
        const end = addMinutes(cursor, chunk.minutes);

        if (end <= work.end && end <= searchEnd) {
          const deepWorkKey =
            dayKey(cursor) + cursor.toISOString().slice(0, 10);
          const currentDeepWork = deepWorkByDay.get(deepWorkKey) ?? 0;
          const fitsDeepWork =
            chunk.task.energyRequired !== "HIGH" ||
            currentDeepWork + chunk.minutes <= prefs.maxDeepWorkPerDay;

          if (
            fitsDeepWork &&
            !hasConflict(cursor, end, occupied, spacingMinutes) &&
            hasEnergyMatch(cursor, end, chunk.task, profile, strictEnergy)
          ) {
            return { start: cursor, end };
          }
        }

        cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
      }
    }

    day = addMinutes(startOfDay(addMinutes(day, 24 * 60)), 0);
  }

  return null;
}

function toFrozenBlock(task: SchedulableTask): ScheduledBlock | null {
  if (!task.scheduledStart || !task.scheduledEnd) {
    return null;
  }

  return {
    taskId: task.id,
    title: task.title,
    start: task.scheduledStart,
    end: task.scheduledEnd,
    chunkIndex: 0,
    chunkCount: 1,
    energyRequired: task.energyRequired,
    contextTag: task.contextTag,
    isFrozen: true,
  };
}

export function scheduleTasks(input: {
  tasks: SchedulableTask[];
  busyBlocks: CalendarBusyBlock[];
  energyProfile: EnergyProfile;
  prefs: SchedulingPreferences;
  now: Date;
}): ScheduleResult {
  // Deterministic scheduling pass:
  // 1. Keep frozen task blocks as immutable busy time.
  // 2. Sort remaining tasks by dependency, priority, deadline pressure, age,
  //    and context tag for stable batching.
  // 3. Keep each visible task block at the user's estimate, split it into
  //    bounded chunks, and reserve the ADHD multiplier as invisible recovery
  //    space after the block. A 30-minute task therefore remains 30 minutes on
  //    the calendar instead of silently becoming 39 minutes.
  // 4. Walk work hours from `now`, skipping calendar/frozen/placed blocks,
  //    buffers, breaks, hard-stop time, and daily deep-work limits.
  // 5. Try energy-matched slots first, then gracefully fall back to any valid
  //    work slot so the planner reports capacity instead of silently failing.
  const frozenBlocks = input.tasks
    .filter((task) => task.isFrozen)
    .map(toFrozenBlock)
    .filter((block): block is ScheduledBlock => block !== null);

  const occupied: OccupiedBlock[] = [
    ...input.busyBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      start: block.start,
      end: block.end,
    })),
    ...frozenBlocks.map((block) => ({
      id: block.taskId,
      title: block.title,
      start: block.start,
      end: block.end,
    })),
  ];

  const unscheduled: UnscheduledTask[] = [];
  const unscheduledTaskIds = new Set<string>();
  const placedTaskEnds = new Map<string, Date>();
  const deepWorkByDay = new Map<string, number>();
  const blocks: ScheduledBlock[] = [];

  for (const block of frozenBlocks) {
    placedTaskEnds.set(block.taskId, block.end);
  }

  const candidateTasks = sortTasks(
    input.tasks.filter((task) => !isDone(task) && !task.isFrozen),
    input.now
  );

  for (const task of candidateTasks) {
    const dependencyReadyAt = findDependencyReadyAt(
      task,
      placedTaskEnds,
      unscheduledTaskIds,
      input.now
    );

    if (!dependencyReadyAt) {
      unscheduled.push({
        taskId: task.id,
        title: task.title,
        reason: "Dependency could not be scheduled",
      });
      unscheduledTaskIds.add(task.id);
      continue;
    }

    const chunks = splitTaskIntoChunks(task, input.prefs);
    const taskBlocks: ScheduledBlock[] = [];
    const occupiedLengthBeforeTask = occupied.length;
    const deepWorkBeforeTask = new Map(deepWorkByDay);
    let cursor = dependencyReadyAt;
    let failedReason: string | null = null;

    for (const chunk of chunks) {
      const strictSlot = findSlot(
        chunk,
        occupied,
        input.energyProfile,
        input.prefs,
        cursor,
        deepWorkByDay,
        true
      );
      const slot =
        strictSlot ??
        findSlot(
          chunk,
          occupied,
          input.energyProfile,
          input.prefs,
          cursor,
          deepWorkByDay,
          false
        );

      if (!slot) {
        failedReason = "No available work-hours slot";
        break;
      }

      const block: ScheduledBlock = {
        taskId: task.id,
        title: task.title,
        start: slot.start,
        end: slot.end,
        chunkIndex: chunk.chunkIndex,
        chunkCount: chunk.chunkCount,
        energyRequired: task.energyRequired,
        contextTag: task.contextTag,
        isFrozen: false,
      };

      taskBlocks.push(block);
      occupied.push({
        id: `${task.id}:${chunk.chunkIndex}`,
        title: task.title,
        start: slot.start,
        end: addMinutes(slot.end, chunk.bufferAfterMinutes),
      });

      if (task.energyRequired === "HIGH") {
        const key = dayKey(slot.start) + slot.start.toISOString().slice(0, 10);
        deepWorkByDay.set(
          key,
          (deepWorkByDay.get(key) ?? 0) + minutesBetween(slot.start, slot.end)
        );
      }

      cursor = addMinutes(
        slot.end,
        chunk.bufferAfterMinutes +
          (input.prefs.enableTaskBatching ? input.prefs.bufferMinutes : 0)
      );
    }

    if (failedReason) {
      occupied.length = occupiedLengthBeforeTask;
      deepWorkByDay.clear();
      for (const [key, value] of deepWorkBeforeTask) {
        deepWorkByDay.set(key, value);
      }
      unscheduled.push({
        taskId: task.id,
        title: task.title,
        reason: failedReason,
      });
      unscheduledTaskIds.add(task.id);
      continue;
    }

    blocks.push(...taskBlocks);
    const latestEnd = taskBlocks.reduce(
      (latest, block) => (block.end > latest ? block.end : latest),
      taskBlocks[0]?.end ?? dependencyReadyAt
    );
    placedTaskEnds.set(task.id, latestEnd);
  }

  return { blocks, unscheduled, frozenBlocks };
}

export function rescheduleFromNow(input: {
  tasks: SchedulableTask[];
  busyBlocks: CalendarBusyBlock[];
  energyProfile: EnergyProfile;
  prefs: SchedulingPreferences;
  now: Date;
}): ScheduleResult {
  const pastBlocks: CalendarBusyBlock[] = input.tasks
    .filter(
      (task) =>
        task.scheduledStart &&
        task.scheduledEnd &&
        (task.isFrozen || task.scheduledEnd <= input.now)
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      start: task.scheduledStart!,
      end: task.scheduledEnd!,
      source: task.isFrozen ? "frozen" : "task",
    }));

  return scheduleTasks({
    ...input,
    busyBlocks: [...input.busyBlocks, ...pastBlocks],
    tasks: input.tasks.filter(
      (task) =>
        !task.scheduledEnd || task.scheduledEnd > input.now || task.isFrozen
    ),
  });
}
