CREATE TABLE "CreemSubscriptionCursor" (
    "userId" TEXT NOT NULL,
    "creemSubscriptionId" TEXT NOT NULL,
    "lastEventId" TEXT NOT NULL,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "restrictionLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreemSubscriptionCursor_pkey" PRIMARY KEY ("userId", "creemSubscriptionId")
);

CREATE INDEX "CreemSubscriptionCursor_userId_lastEventAt_idx"
ON "CreemSubscriptionCursor"("userId", "lastEventAt");

ALTER TABLE "CreemSubscriptionCursor"
ADD CONSTRAINT "CreemSubscriptionCursor_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CreemSubscriptionCursor" (
    "userId",
    "creemSubscriptionId",
    "lastEventId",
    "lastEventAt",
    "restrictionLevel",
    "updatedAt"
)
SELECT
    "userId",
    "creemSubscriptionId",
    COALESCE("lastCreemEventId", 'migration-backfill'),
    "lastCreemEventAt",
    CASE
        WHEN "status" = 'CANCELED' AND "currentPeriodEnd" IS NULL THEN 5
        WHEN "status" = 'CANCELED' THEN 4
        WHEN "status" = 'PAYMENT_FAILED' THEN 3
        WHEN "status" = 'PAST_DUE' THEN 2
        WHEN "cancelAtPeriodEnd" THEN 1
        ELSE 0
    END,
    CURRENT_TIMESTAMP
FROM "Subscription"
WHERE "creemSubscriptionId" IS NOT NULL
  AND "lastCreemEventAt" IS NOT NULL
ON CONFLICT ("userId", "creemSubscriptionId") DO NOTHING;
