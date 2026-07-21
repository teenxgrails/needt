-- CreateTable
CREATE TABLE "DailyAgenda" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyAgenda_userId_date_key" ON "DailyAgenda"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyAgenda_userId_date_idx" ON "DailyAgenda"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyAgenda" ADD CONSTRAINT "DailyAgenda_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
