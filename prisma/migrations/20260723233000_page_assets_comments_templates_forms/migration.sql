-- Private Page extensions. These remain owner-scoped and do not add public
-- sharing, collaboration roles, or anonymous form submission.
CREATE TABLE "PageAsset" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageComment" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "blockId" TEXT,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageForm" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "schema" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageFormSubmission" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "values" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageFormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageAsset_pageId_createdAt_idx" ON "PageAsset"("pageId", "createdAt");
CREATE INDEX "PageAsset_userId_createdAt_idx" ON "PageAsset"("userId", "createdAt");
CREATE INDEX "PageComment_pageId_resolvedAt_createdAt_idx" ON "PageComment"("pageId", "resolvedAt", "createdAt");
CREATE INDEX "PageComment_blockId_idx" ON "PageComment"("blockId");
CREATE INDEX "PageComment_userId_idx" ON "PageComment"("userId");
CREATE UNIQUE INDEX "PageTemplate_userId_name_key" ON "PageTemplate"("userId", "name");
CREATE INDEX "PageTemplate_userId_updatedAt_idx" ON "PageTemplate"("userId", "updatedAt");
CREATE INDEX "PageForm_pageId_createdAt_idx" ON "PageForm"("pageId", "createdAt");
CREATE INDEX "PageFormSubmission_formId_submittedAt_idx" ON "PageFormSubmission"("formId", "submittedAt");
CREATE INDEX "PageFormSubmission_userId_submittedAt_idx" ON "PageFormSubmission"("userId", "submittedAt");

ALTER TABLE "PageAsset"
  ADD CONSTRAINT "PageAsset_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PageAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageComment"
  ADD CONSTRAINT "PageComment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PageComment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "PageBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PageComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageTemplate"
  ADD CONSTRAINT "PageTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageForm"
  ADD CONSTRAINT "PageForm_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageFormSubmission"
  ADD CONSTRAINT "PageFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PageForm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PageFormSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
