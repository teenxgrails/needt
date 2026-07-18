-- CreateEnum
CREATE TYPE "AgentMemoryKind" AS ENUM ('preference', 'pattern', 'goal', 'fact');

-- CreateEnum
CREATE TYPE "AgentMemorySource" AS ENUM ('chat', 'inferred');

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AgentMemoryKind" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "AgentMemorySource" NOT NULL DEFAULT 'chat',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "actionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMemory_userId_lastUsedAt_idx" ON "AgentMemory"("userId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_userId_weight_idx" ON "AgentMemory"("userId", "weight");

-- CreateIndex
CREATE INDEX "AiUsage_yearMonth_idx" ON "AiUsage"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_yearMonth_key" ON "AiUsage"("userId", "yearMonth");

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
