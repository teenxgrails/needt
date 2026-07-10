CREATE TABLE "UserCustomization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#6366F1',
    "backgroundTint" TEXT NOT NULL DEFAULT '#1B1D1E',
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "sidebarWidth" INTEGER NOT NULL DEFAULT 244,
    "radius" INTEGER NOT NULL DEFAULT 8,
    "fontFamily" TEXT NOT NULL DEFAULT 'system',
    "eventChipStyle" TEXT NOT NULL DEFAULT 'flat',
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "themePreset" TEXT NOT NULL DEFAULT 'flowday',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCustomization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCustomization_userId_key" ON "UserCustomization"("userId");
CREATE INDEX "UserCustomization_userId_idx" ON "UserCustomization"("userId");

ALTER TABLE "UserCustomization" ADD CONSTRAINT "UserCustomization_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
