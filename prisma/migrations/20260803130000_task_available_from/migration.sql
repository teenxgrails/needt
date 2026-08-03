ALTER TABLE "Task"
ADD COLUMN "availableFrom" TIMESTAMP(3);

CREATE INDEX "Task_availableFrom_idx" ON "Task"("availableFrom");
