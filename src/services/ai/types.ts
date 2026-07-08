import {
  CalendarBusyBlock,
  EnergyProfile,
  SchedulableTask,
  ScheduleResult,
  SchedulingEnergyLevel,
  SchedulingPreferences,
  SchedulingTaskPriority,
} from "@/services/scheduling/engine";
import { CalibrationContext } from "@/services/time-tracking/calibration";

export type AIProviderName = "NONE" | "ANTHROPIC" | "OPENAI" | "CUSTOM";

export interface SchedulingContext {
  tasks: SchedulableTask[];
  busyBlocks: CalendarBusyBlock[];
  energyProfile: EnergyProfile;
  prefs: SchedulingPreferences;
  now: string;
  deterministicResult?: ScheduleResult;
  calibration?: CalibrationContext;
}

export interface AIScheduleMove {
  taskId: string;
  fromStart?: string | null;
  fromEnd?: string | null;
  toStart: string;
  toEnd: string;
  reason: string;
}

export interface AISuggestion {
  summary: string;
  moves: AIScheduleMove[];
  reorderedTaskIds?: string[];
  energyTags?: Array<{
    taskId: string;
    energyRequired: SchedulingEnergyLevel;
    reason: string;
  }>;
  estimateAdjustments?: Array<{
    taskId: string;
    estimatedMinutes: number;
    reason: string;
  }>;
  warnings?: string[];
}

export interface ParsedTask {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  minChunkMinutes?: number;
  maxChunkMinutes?: number;
  deadline?: string;
  priority?: SchedulingTaskPriority;
  energyRequired?: SchedulingEnergyLevel;
  contextTag?: string;
}

export interface SchedulerAI {
  name: string;
  suggestSchedule(input: SchedulingContext): Promise<AISuggestion>;
  parseTasks(text: string): Promise<ParsedTask[]>;
}

export interface SchedulerAIConfig {
  provider: AIProviderName;
  apiKey?: string | null;
  customUrl?: string | null;
  model?: string | null;
  timeoutMs?: number;
}
