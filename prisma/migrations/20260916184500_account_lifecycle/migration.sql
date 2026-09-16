-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'DOWNLOADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccountDeletionStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastAuthenticatedAt" TIMESTAMP(3);

-- Shared-workspace artifacts must survive account deletion without retaining
-- a user foreign key. Personal rows are removed explicitly by the finalizer.
ALTER TABLE "Board" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "SavedView" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Page" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageFolder" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageTag" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageSmartFolder" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageAsset" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageRevision" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "TaskDependency" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PageAccessGrant" ALTER COLUMN "grantedById" DROP NOT NULL;
ALTER TABLE "Moodboard" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "MoodboardAccessGrant" ALTER COLUMN "grantedById" DROP NOT NULL;

-- Replace destructive or blocking user foreign keys with authorless tombstones.
ALTER TABLE "Board" DROP CONSTRAINT "Board_userId_fkey";
ALTER TABLE "SavedView" DROP CONSTRAINT "SavedView_userId_fkey";
ALTER TABLE "Page" DROP CONSTRAINT "Page_userId_fkey";
ALTER TABLE "PageFolder" DROP CONSTRAINT "PageFolder_userId_fkey";
ALTER TABLE "PageTag" DROP CONSTRAINT "PageTag_userId_fkey";
ALTER TABLE "PageSmartFolder" DROP CONSTRAINT "PageSmartFolder_userId_fkey";
ALTER TABLE "PageAsset" DROP CONSTRAINT "PageAsset_userId_fkey";
ALTER TABLE "PageRevision" DROP CONSTRAINT "PageRevision_userId_fkey";
ALTER TABLE "TaskDependency" DROP CONSTRAINT "TaskDependency_userId_fkey";
ALTER TABLE "PageAccessGrant" DROP CONSTRAINT "PageAccessGrant_grantedById_fkey";
ALTER TABLE "Moodboard" DROP CONSTRAINT "Moodboard_createdById_fkey";
ALTER TABLE "MoodboardAccessGrant" DROP CONSTRAINT "MoodboardAccessGrant_grantedById_fkey";

ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Page" ADD CONSTRAINT "Page_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageFolder" ADD CONSTRAINT "PageFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageTag" ADD CONSTRAINT "PageTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageSmartFolder" ADD CONSTRAINT "PageSmartFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageAsset" ADD CONSTRAINT "PageAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageAccessGrant" ADD CONSTRAINT "PageAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Moodboard" ADD CONSTRAINT "Moodboard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MoodboardAccessGrant" ADD CONSTRAINT "MoodboardAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'PENDING',
    "archive" BYTEA,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "status" "AccountDeletionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountReauthentication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "challengeHash" TEXT,
    "provider" TEXT,
    "authenticatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountReauthentication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataExportRequest_tokenHash_key" ON "DataExportRequest"("tokenHash");
CREATE INDEX "DataExportRequest_userId_createdAt_idx" ON "DataExportRequest"("userId", "createdAt");
CREATE INDEX "DataExportRequest_status_expiresAt_idx" ON "DataExportRequest"("status", "expiresAt");
CREATE UNIQUE INDEX "AccountDeletionRequest_userId_key" ON "AccountDeletionRequest"("userId");
CREATE INDEX "AccountDeletionRequest_status_scheduledFor_idx" ON "AccountDeletionRequest"("status", "scheduledFor");
CREATE UNIQUE INDEX "AccountReauthentication_challengeHash_key" ON "AccountReauthentication"("challengeHash");
CREATE INDEX "AccountReauthentication_userId_sessionHash_expiresAt_idx" ON "AccountReauthentication"("userId", "sessionHash", "expiresAt");
CREATE INDEX "AccountReauthentication_expiresAt_idx" ON "AccountReauthentication"("expiresAt");

-- AddForeignKey
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountReauthentication" ADD CONSTRAINT "AccountReauthentication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
