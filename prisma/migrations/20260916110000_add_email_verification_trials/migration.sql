-- AddColumn
ALTER TABLE "SystemSettings"
ADD COLUMN "requireEmailVerificationBeforeAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TrialGrant" (
    "id" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "day11ClaimedAt" TIMESTAMP(3),
    "day11SentAt" TIMESTAMP(3),
    "day14ClaimedAt" TIMESTAMP(3),
    "day14SentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialGrant_emailKey_key" ON "TrialGrant"("emailKey");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGrant_userId_key" ON "TrialGrant"("userId");

-- CreateIndex
CREATE INDEX "TrialGrant_endsAt_idx" ON "TrialGrant"("endsAt");

-- CreateIndex
CREATE INDEX "TrialGrant_day11SentAt_startedAt_idx" ON "TrialGrant"("day11SentAt", "startedAt");

-- CreateIndex
CREATE INDEX "TrialGrant_day14SentAt_endsAt_idx" ON "TrialGrant"("day14SentAt", "endsAt");

-- AddForeignKey
ALTER TABLE "TrialGrant"
ADD CONSTRAINT "TrialGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
