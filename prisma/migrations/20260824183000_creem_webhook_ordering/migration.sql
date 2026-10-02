ALTER TABLE "Subscription"
ADD COLUMN "lastCreemEventId" TEXT,
ADD COLUMN "lastCreemEventAt" TIMESTAMP(3);

CREATE TABLE "CreemWebhookEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventCreatedAt" TIMESTAMP(3) NOT NULL,
  "outcome" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreemWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreemWebhookEvent_userId_eventCreatedAt_idx"
ON "CreemWebhookEvent"("userId", "eventCreatedAt");

ALTER TABLE "CreemWebhookEvent"
ADD CONSTRAINT "CreemWebhookEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
