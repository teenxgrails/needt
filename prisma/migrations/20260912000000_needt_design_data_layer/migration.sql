-- CreateEnum
CREATE TYPE "TaskStage" AS ENUM ('TODO', 'DOING', 'REVIEW', 'DONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hue" TEXT,
ADD COLUMN     "initials" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "earnedCents" INTEGER,
ADD COLUMN     "entry" TEXT,
ADD COLUMN     "globalStage" "TaskStage",
ADD COLUMN     "lastTouchedAt" TIMESTAMP(3),
ADD COLUMN     "noSlot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousScheduledStart" TIMESTAMP(3),
ADD COLUMN     "valueCents" INTEGER;

-- CreateTable
CREATE TABLE "TaskPart" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskWait" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "waitingOnUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "at" TEXT,
    "projectId" TEXT,
    "quota" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCompletion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosedDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskPart_taskId_position_idx" ON "TaskPart"("taskId", "position");

-- CreateIndex
CREATE INDEX "TaskWait_taskId_resolvedAt_idx" ON "TaskWait"("taskId", "resolvedAt");

-- CreateIndex
CREATE INDEX "TaskWait_waitingOnUserId_resolvedAt_idx" ON "TaskWait"("waitingOnUserId", "resolvedAt");

-- CreateIndex
CREATE INDEX "Habit_userId_archivedAt_idx" ON "Habit"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Habit_projectId_idx" ON "Habit"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCompletion_habitId_date_key" ON "HabitCompletion"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedDay_userId_date_key" ON "ClosedDay"("userId", "date");

-- CreateIndex
CREATE INDEX "Task_globalStage_idx" ON "Task"("globalStage");

-- AddForeignKey
ALTER TABLE "TaskPart" ADD CONSTRAINT "TaskPart_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWait" ADD CONSTRAINT "TaskWait_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWait" ADD CONSTRAINT "TaskWait_waitingOnUserId_fkey" FOREIGN KEY ("waitingOnUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCompletion" ADD CONSTRAINT "HabitCompletion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedDay" ADD CONSTRAINT "ClosedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

