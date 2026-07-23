-- Personal Pages, database views, AI change proposals, bug reports, and
-- provider-neutral integration connections. Legacy Board tables remain intact.
CREATE TYPE "PageAuthor" AS ENUM ('HUMAN', 'AI');
CREATE TYPE "PageBlockType" AS ENUM ('PARAGRAPH', 'HEADING_1', 'HEADING_2', 'HEADING_3', 'BULLETED_LIST', 'NUMBERED_LIST', 'CHECKLIST', 'TOGGLE', 'QUOTE', 'CALLOUT', 'CODE', 'DIVIDER', 'LINK', 'BOOKMARK', 'IMAGE', 'FILE', 'TABLE', 'COLUMNS', 'PAGE_MENTION', 'DATE_MENTION', 'INLINE_DATABASE', 'FORM');
CREATE TYPE "DatabasePropertyType" AS ENUM ('TITLE', 'TEXT', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'DATE', 'URL', 'EMAIL', 'PHONE', 'FILES', 'FORMULA', 'RELATION', 'ROLLUP');
CREATE TYPE "DatabaseViewType" AS ENUM ('TABLE', 'BOARD', 'LIST', 'TIMELINE', 'CALENDAR', 'GALLERY');
CREATE TYPE "AiProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');
CREATE TYPE "BugReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "BugReportStatus" AS ENUM ('OPEN', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ExternalIntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "icon" TEXT,
    "coverUrl" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" "PageAuthor" NOT NULL DEFAULT 'HUMAN',
    "trashedAt" TIMESTAMP(3),
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "parentBlockId" TEXT,
    "type" "PageBlockType" NOT NULL,
    "content" JSONB NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" "PageAuthor" NOT NULL DEFAULT 'HUMAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageDatabase" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageDatabase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseProperty" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabasePropertyType" NOT NULL,
    "config" JSONB,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseRecord" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseValue" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseView" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DatabaseViewType" NOT NULL,
    "filters" JSONB,
    "sort" JSONB,
    "group" JSONB,
    "config" JSONB,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatabaseView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" "PageAuthor" NOT NULL DEFAULT 'HUMAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiPageChangeProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "operations" JSONB NOT NULL,
    "status" "AiProposalStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiPageChangeProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reproductionSteps" TEXT,
    "expectedBehavior" TEXT,
    "actualBehavior" TEXT,
    "severity" "BugReportSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugReportStatus" NOT NULL DEFAULT 'OPEN',
    "route" TEXT,
    "appVersion" TEXT,
    "viewport" TEXT,
    "theme" TEXT,
    "browser" TEXT,
    "githubIssueUrl" TEXT,
    "githubSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BugReportAttachment" (
    "id" TEXT NOT NULL,
    "bugReportId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BugReportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "toolkit" TEXT NOT NULL,
    "externalConnectionId" TEXT NOT NULL,
    "status" "ExternalIntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "permissions" JSONB,
    "scopes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageDatabase_pageId_key" ON "PageDatabase"("pageId");
CREATE UNIQUE INDEX "DatabaseRecord_pageId_key" ON "DatabaseRecord"("pageId");
CREATE UNIQUE INDEX "DatabaseValue_recordId_propertyId_key" ON "DatabaseValue"("recordId", "propertyId");
CREATE UNIQUE INDEX "ExternalIntegration_userId_provider_toolkit_externalConnectionId_key" ON "ExternalIntegration"("userId", "provider", "toolkit", "externalConnectionId");
CREATE INDEX "Page_userId_parentId_position_idx" ON "Page"("userId", "parentId", "position");
CREATE INDEX "Page_userId_isFavorite_idx" ON "Page"("userId", "isFavorite");
CREATE INDEX "Page_userId_trashedAt_idx" ON "Page"("userId", "trashedAt");
CREATE INDEX "PageBlock_pageId_parentBlockId_position_idx" ON "PageBlock"("pageId", "parentBlockId", "position");
CREATE INDEX "DatabaseProperty_databaseId_position_idx" ON "DatabaseProperty"("databaseId", "position");
CREATE INDEX "DatabaseRecord_databaseId_position_idx" ON "DatabaseRecord"("databaseId", "position");
CREATE INDEX "DatabaseValue_propertyId_idx" ON "DatabaseValue"("propertyId");
CREATE INDEX "DatabaseView_databaseId_position_idx" ON "DatabaseView"("databaseId", "position");
CREATE INDEX "PageRevision_pageId_createdAt_idx" ON "PageRevision"("pageId", "createdAt");
CREATE INDEX "PageRevision_userId_createdAt_idx" ON "PageRevision"("userId", "createdAt");
CREATE INDEX "AiPageChangeProposal_userId_status_createdAt_idx" ON "AiPageChangeProposal"("userId", "status", "createdAt");
CREATE INDEX "AiPageChangeProposal_pageId_createdAt_idx" ON "AiPageChangeProposal"("pageId", "createdAt");
CREATE INDEX "BugReport_userId_createdAt_idx" ON "BugReport"("userId", "createdAt");
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");
CREATE INDEX "BugReportAttachment_bugReportId_idx" ON "BugReportAttachment"("bugReportId");
CREATE INDEX "ExternalIntegration_userId_provider_status_idx" ON "ExternalIntegration"("userId", "provider", "status");

ALTER TABLE "Page" ADD CONSTRAINT "Page_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Page" ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "PageBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageDatabase" ADD CONSTRAINT "PageDatabase_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseProperty" ADD CONSTRAINT "DatabaseProperty_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "PageDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "PageDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseRecord" ADD CONSTRAINT "DatabaseRecord_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseValue" ADD CONSTRAINT "DatabaseValue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DatabaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseValue" ADD CONSTRAINT "DatabaseValue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "DatabaseProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseView" ADD CONSTRAINT "DatabaseView_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "PageDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiPageChangeProposal" ADD CONSTRAINT "AiPageChangeProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiPageChangeProposal" ADD CONSTRAINT "AiPageChangeProposal_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BugReportAttachment" ADD CONSTRAINT "BugReportAttachment_bugReportId_fkey" FOREIGN KEY ("bugReportId") REFERENCES "BugReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalIntegration" ADD CONSTRAINT "ExternalIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
