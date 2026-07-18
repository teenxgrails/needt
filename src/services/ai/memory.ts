import { AgentMemoryKind, AgentMemorySource, Prisma } from "@prisma/client";
import { z } from "zod";

import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const AGENT_MEMORY_LIMIT = 100;

export const memoryInputSchema = z.object({
  kind: z.nativeEnum(AgentMemoryKind),
  content: z.string().trim().min(3).max(500),
  source: z.nativeEnum(AgentMemorySource).default(AgentMemorySource.chat),
  weight: z.number().min(0.1).max(10).default(1),
});

export type RankedMemory = {
  id: string;
  kind: AgentMemoryKind | string;
  content: string;
  weight: number;
  lastUsedAt: Date;
};

export function rankMemories(memories: RankedMemory[], now = newDate()) {
  return [...memories].sort((a, b) => {
    const ageA = Math.max(0, now.getTime() - a.lastUsedAt.getTime());
    const ageB = Math.max(0, now.getTime() - b.lastUsedAt.getTime());
    const recencyA = 1 / (1 + ageA / 86_400_000);
    const recencyB = 1 / (1 + ageB / 86_400_000);
    return b.weight + recencyB - (a.weight + recencyA);
  });
}

export async function listAgentMemories(userId: string) {
  return prisma.agentMemory.findMany({
    where: { userId },
    orderBy: [{ weight: "desc" }, { lastUsedAt: "desc" }],
    take: AGENT_MEMORY_LIMIT,
  });
}

export async function rememberForUser(
  userId: string,
  input: z.input<typeof memoryInputSchema>
) {
  const data = memoryInputSchema.parse(input);
  const existing = await prisma.agentMemory.findFirst({
    where: {
      userId,
      kind: data.kind,
      content: { equals: data.content, mode: "insensitive" },
    },
  });
  const memory = existing
    ? await prisma.agentMemory.update({
        where: { id: existing.id },
        data: {
          source: data.source,
          weight: Math.max(existing.weight, data.weight),
          lastUsedAt: newDate(),
        },
      })
    : await prisma.agentMemory.create({ data: { userId, ...data } });

  const count = await prisma.agentMemory.count({ where: { userId } });
  const stale =
    count > AGENT_MEMORY_LIMIT
      ? await prisma.agentMemory.findMany({
          where: { userId },
          orderBy: [{ lastUsedAt: "asc" }, { weight: "asc" }],
          take: count - AGENT_MEMORY_LIMIT,
          select: { id: true },
        })
      : [];
  if (stale.length) {
    await prisma.agentMemory.deleteMany({
      where: { userId, id: { in: stale.map((item) => item.id) } },
    });
  }
  return memory;
}

export async function forgetForUser(userId: string, memoryId: string) {
  const result = await prisma.agentMemory.deleteMany({
    where: { id: memoryId, userId },
  });
  return result.count > 0;
}

export async function clearAgentMemories(userId: string) {
  return prisma.agentMemory.deleteMany({ where: { userId } });
}

export async function touchMemories(userId: string, memoryIds: string[]) {
  if (!memoryIds.length) return;
  await prisma.agentMemory.updateMany({
    where: { userId, id: { in: memoryIds } },
    data: { lastUsedAt: newDate() },
  });
}

export function memoryJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
