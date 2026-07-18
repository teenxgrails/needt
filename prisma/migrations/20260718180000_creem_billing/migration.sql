ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PRO';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

ALTER TABLE "Subscription"
  ADD COLUMN "creemCustomerId" TEXT,
  ADD COLUMN "creemSubscriptionId" TEXT,
  ADD COLUMN "creemProductId" TEXT,
  ADD COLUMN "interval" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Subscription_creemCustomerId_key"
  ON "Subscription"("creemCustomerId");
CREATE UNIQUE INDEX "Subscription_creemSubscriptionId_key"
  ON "Subscription"("creemSubscriptionId");
CREATE INDEX "Subscription_creemProductId_idx"
  ON "Subscription"("creemProductId");
