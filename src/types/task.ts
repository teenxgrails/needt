import type { Prisma } from "@prisma/client";

import { ChangeType } from "@/lib/task-sync/task-change-tracker";

import { Project } from "./project";

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum EnergyLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum Priority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

export enum TimePreference {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
}

export enum SchedulingEnergyLevel {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum SchedulingTaskPriority {
  URGENT = "URGENT",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueDate?: Date | null;
  startDate?: Date | null;
  duration?: number | null;
  priority?: Priority | null;
  energyLevel?: EnergyLevel | null;
  preferredTime?: TimePreference | null;
  energyRequired?: SchedulingEnergyLevel;
  estimatedMinutes?: number | null;
  estOptimistic?: number | null;
  estLikely?: number | null;
  estPessimistic?: number | null;
  actualMinutes?: number | null;
  estimateDelta?: number | null;
  optimisticDelta?: number | null;
  likelyDelta?: number | null;
  pessimisticDelta?: number | null;
  minChunkMinutes?: number | null;
  maxChunkMinutes?: number | null;
  deadline?: Date | null;
  hardDeadline: boolean;
  priorityLevel?: SchedulingTaskPriority;
  contextTag?: string | null;
  isFrozen?: boolean;
  dependsOnId?: string | null;
  autoScheduled?: boolean;
  scheduledBlocks?: ScheduledTaskBlock[];
  tags: Tag[];
  projectId?: string | null;
  project?: Project | null;
  createdAt: Date;
  updatedAt: Date;
  recurrenceRule?: string | null;
  lastCompletedDate?: Date | null;
  completedAt?: Date | null;
  isRecurring: boolean;
  // Auto-scheduling fields
  isAutoScheduled: boolean;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  scheduleId?: string | null;
  scheduleScore?: number | null;
  lastScheduled?: Date | null;
  scheduleLocked: boolean;
  availableFrom?: Date | null;
  postponedUntil?: Date | null;
  isArchived: boolean;
  archivedAt?: Date | null;
  // External sync fields
  externalTaskId?: string | null;
  source?: string | null;
  externalListId?: string | null;
  lastSyncedAt?: Date | null;
  // Boards (additive; independent of the scheduling engine)
  boardId?: string | null;
  boardColumnId?: string | null;
  boardPosition?: number | null;
  properties?: Prisma.JsonValue | null;
}

export interface ScheduledTaskBlock {
  id: string;
  taskId: string;
  userId?: string | null;
  start: Date | string;
  end: Date | string;
  chunkIndex: number;
  chunkCount: number;
  isFrozen: boolean;
}

export interface NewTask
  extends Omit<
    Task,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "tags"
    | "project"
    | "hardDeadline"
    | "isArchived"
    | "archivedAt"
  > {
  tagIds?: string[];
  hardDeadline?: boolean;
  isAutoScheduled: boolean;
  scheduleLocked: boolean;
}

export interface UpdateTask
  extends Partial<
    Omit<Task, "id" | "createdAt" | "updatedAt" | "tags" | "project">
  > {
  tagIds?: string[];
  /** "Start task now" is an explicit, immediate action — let it through even
   * if the target time falls inside a blocked-hours override. Not for any
   * other manual-placement flow (drag, resize, external drop, create). */
  bypassBlockedHours?: boolean;
}

export type NewTag = Omit<Tag, "id">;

export interface TaskFilters {
  status?: TaskStatus[];
  tagIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  startDate?: Date | null;
  hideUpcomingTasks?: boolean;
  priority?: Priority[];
  energyLevel?: EnergyLevel[];
  timePreference?: TimePreference[];
  search?: string;
  projectId?: string;
}

/**
 * Task with its related entities
 */
export interface TaskWithRelations extends Task {
  tags: Tag[];
  project: Project | null;
}

export interface TaskChange {
  id: string;
  taskId: string;
  changeType: ChangeType;
  changeData: Record<string, unknown>;
}
