import { prisma } from "@/lib/prisma";

export interface ContextCalibration {
  contextTag: string;
  completedCount: number;
  factor: number;
  medianActualMinutes: number;
  medianLikelyMinutes: number;
  overUnderPercent: number;
  trend: "improving" | "steady" | "widening";
}

export interface CalibrationContext {
  totalCompletedWithActuals: number;
  factors: Record<string, number>;
  contexts: ContextCalibration[];
  reportReady: boolean;
}

type CalibrationTask = {
  contextTag: string | null;
  estLikely: number | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  completedAt: Date | null;
};

const MIN_CONTEXT_SAMPLE = 5;
const REPORT_READY_SAMPLE = 20;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function ratioForTask(task: CalibrationTask): number | null {
  const likely = task.estLikely ?? task.estimatedMinutes;
  if (!task.actualMinutes || !likely || likely <= 0) return null;
  return task.actualMinutes / likely;
}

function trendForTasks(tasks: CalibrationTask[]): ContextCalibration["trend"] {
  const ordered = [...tasks]
    .filter((task) => task.completedAt && ratioForTask(task) !== null)
    .sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0)
    );

  if (ordered.length < 6) return "steady";

  const midpoint = Math.floor(ordered.length / 2);
  const first = median(
    ordered
      .slice(0, midpoint)
      .map((task) => Math.abs((ratioForTask(task) ?? 1) - 1))
  );
  const second = median(
    ordered
      .slice(midpoint)
      .map((task) => Math.abs((ratioForTask(task) ?? 1) - 1))
  );

  if (second < first * 0.85) return "improving";
  if (second > first * 1.15) return "widening";
  return "steady";
}

export function buildCalibrationContext(
  tasks: CalibrationTask[]
): CalibrationContext {
  const eligible = tasks.filter((task) => ratioForTask(task) !== null);
  const grouped = new Map<string, CalibrationTask[]>();

  for (const task of eligible) {
    const tag = task.contextTag?.trim().toLowerCase();
    if (!tag) continue;
    grouped.set(tag, [...(grouped.get(tag) ?? []), task]);
  }

  const contexts = Array.from(grouped.entries())
    .map(([contextTag, contextTasks]) => {
      const ratios = contextTasks
        .map(ratioForTask)
        .filter((ratio): ratio is number => ratio !== null);
      const actuals = contextTasks
        .map((task) => task.actualMinutes)
        .filter((minutes): minutes is number => Boolean(minutes));
      const likely = contextTasks
        .map((task) => task.estLikely ?? task.estimatedMinutes)
        .filter((minutes): minutes is number => Boolean(minutes));
      const factor = median(ratios);

      return {
        contextTag,
        completedCount: contextTasks.length,
        factor,
        medianActualMinutes: Math.round(median(actuals)),
        medianLikelyMinutes: Math.round(median(likely)),
        overUnderPercent: Math.round((factor - 1) * 100),
        trend: trendForTasks(contextTasks),
      };
    })
    .filter((context) => context.completedCount >= MIN_CONTEXT_SAMPLE)
    .sort((a, b) => b.completedCount - a.completedCount);

  return {
    totalCompletedWithActuals: eligible.length,
    factors: Object.fromEntries(
      contexts.map((context) => [context.contextTag, context.factor])
    ),
    contexts,
    reportReady: eligible.length >= REPORT_READY_SAMPLE,
  };
}

export async function getCalibrationContext(
  userId: string
): Promise<CalibrationContext> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: "completed",
      actualMinutes: { gt: 0 },
    },
    select: {
      contextTag: true,
      estLikely: true,
      estimatedMinutes: true,
      actualMinutes: true,
      completedAt: true,
    },
  });

  return buildCalibrationContext(tasks);
}

export function getContextFactor(
  context: CalibrationContext,
  contextTag?: string | null
): number | undefined {
  if (!contextTag) return undefined;
  return context.factors[contextTag.trim().toLowerCase()];
}
