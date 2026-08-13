-- Workspace-safe Page organization. All additions preserve current Page rows
-- and use archive timestamps instead of physical deletion.
CREATE TABLE "PageFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageSmartFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "queryVersion" INTEGER NOT NULL DEFAULT 1,
    "query" JSONB NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageSmartFolder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Page" ADD COLUMN "folderId" TEXT;

CREATE TABLE "_PageToPageTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_PageToPageTag_AB_unique" ON "_PageToPageTag"("A", "B");
CREATE INDEX "_PageToPageTag_B_index" ON "_PageToPageTag"("B");
CREATE INDEX "Page_folderId_idx" ON "Page"("folderId");
CREATE INDEX "PageFolder_workspaceId_archivedAt_position_idx" ON "PageFolder"("workspaceId", "archivedAt", "position");
CREATE INDEX "PageFolder_userId_archivedAt_idx" ON "PageFolder"("userId", "archivedAt");
CREATE INDEX "PageTag_workspaceId_archivedAt_idx" ON "PageTag"("workspaceId", "archivedAt");
CREATE INDEX "PageTag_userId_archivedAt_idx" ON "PageTag"("userId", "archivedAt");
CREATE INDEX "PageSmartFolder_workspaceId_archivedAt_position_idx" ON "PageSmartFolder"("workspaceId", "archivedAt", "position");
CREATE INDEX "PageSmartFolder_userId_archivedAt_idx" ON "PageSmartFolder"("userId", "archivedAt");

ALTER TABLE "Page" ADD CONSTRAINT "Page_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "PageFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageFolder" ADD CONSTRAINT "PageFolder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageFolder" ADD CONSTRAINT "PageFolder_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PageTag" ADD CONSTRAINT "PageTag_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageTag" ADD CONSTRAINT "PageTag_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PageSmartFolder" ADD CONSTRAINT "PageSmartFolder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageSmartFolder" ADD CONSTRAINT "PageSmartFolder_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_PageToPageTag" ADD CONSTRAINT "_PageToPageTag_A_fkey"
FOREIGN KEY ("A") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_PageToPageTag" ADD CONSTRAINT "_PageToPageTag_B_fkey"
FOREIGN KEY ("B") REFERENCES "PageTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
