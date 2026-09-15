CREATE TABLE "Habit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetOccurrencesPerWeek" INTEGER NOT NULL DEFAULT 1,
  "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
  "energyRequired" "SchedulingEnergyLevel" NOT NULL DEFAULT 'MEDIUM',
  "priority" "SchedulingTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "scheduleId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklyFocusTarget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "targetMinutes" INTEGER NOT NULL DEFAULT 300,
  "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyFocusTarget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
ADD COLUMN "habitId" TEXT,
ADD COLUMN "habitOccurrenceAt" TIMESTAMP(3);

CREATE INDEX "Habit_workspaceId_archivedAt_isActive_idx" ON "Habit"("workspaceId", "archivedAt", "isActive");
CREATE INDEX "Habit_userId_archivedAt_idx" ON "Habit"("userId", "archivedAt");
CREATE INDEX "Habit_scheduleId_idx" ON "Habit"("scheduleId");
CREATE UNIQUE INDEX "WeeklyFocusTarget_userId_workspaceId_key" ON "WeeklyFocusTarget"("userId", "workspaceId");
CREATE INDEX "WeeklyFocusTarget_workspaceId_idx" ON "WeeklyFocusTarget"("workspaceId");
CREATE UNIQUE INDEX "Task_habitId_habitOccurrenceAt_key" ON "Task"("habitId", "habitOccurrenceAt");
CREATE INDEX "Task_habitId_habitOccurrenceAt_idx" ON "Task"("habitId", "habitOccurrenceAt");

ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WeeklyFocusTarget" ADD CONSTRAINT "WeeklyFocusTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyFocusTarget" ADD CONSTRAINT "WeeklyFocusTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Habit" ADD CONSTRAINT "Habit_targetOccurrencesPerWeek_check" CHECK ("targetOccurrencesPerWeek" BETWEEN 1 AND 7);
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_estimatedMinutes_check" CHECK ("estimatedMinutes" BETWEEN 5 AND 480);
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_daysOfWeek_check" CHECK ("daysOfWeek" <@ ARRAY[0,1,2,3,4,5,6]);
ALTER TABLE "WeeklyFocusTarget" ADD CONSTRAINT "WeeklyFocusTarget_targetMinutes_check" CHECK ("targetMinutes" BETWEEN 0 AND 10080);
ALTER TABLE "WeeklyFocusTarget" ADD CONSTRAINT "WeeklyFocusTarget_weekStartsOn_check" CHECK ("weekStartsOn" IN (0, 1));
