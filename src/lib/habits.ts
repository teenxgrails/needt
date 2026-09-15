import {
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
} from "@prisma/client";
import { z } from "zod";

export const habitInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  targetOccurrencesPerWeek: z.number().int().min(1).max(7),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  estimatedMinutes: z.number().int().min(5).max(480),
  energyRequired: z
    .nativeEnum(SchedulingEnergyLevel)
    .default(SchedulingEnergyLevel.MEDIUM),
  priority: z
    .nativeEnum(SchedulingTaskPriority)
    .default(SchedulingTaskPriority.MEDIUM),
  scheduleId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().default(true),
});
