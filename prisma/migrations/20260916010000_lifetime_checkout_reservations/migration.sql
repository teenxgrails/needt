-- CreateEnum
CREATE TYPE "LifetimeCheckoutReservationStatus" AS ENUM ('CREATING', 'PENDING', 'CONSUMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "LifetimeCheckoutReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "creemCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "status" "LifetimeCheckoutReservationStatus" NOT NULL DEFAULT 'CREATING',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifetimeCheckoutReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifetimeCheckoutReservation_userId_key" ON "LifetimeCheckoutReservation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LifetimeCheckoutReservation_requestId_key" ON "LifetimeCheckoutReservation"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "LifetimeCheckoutReservation_creemCheckoutId_key" ON "LifetimeCheckoutReservation"("creemCheckoutId");

-- CreateIndex
CREATE INDEX "LifetimeCheckoutReservation_status_updatedAt_idx" ON "LifetimeCheckoutReservation"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "LifetimeCheckoutReservation" ADD CONSTRAINT "LifetimeCheckoutReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
