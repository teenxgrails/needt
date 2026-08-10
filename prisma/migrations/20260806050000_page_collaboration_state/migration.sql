-- Persist self-hosted Yjs document state for realtime Pages.
CREATE TABLE "PageCollaborationState" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "state" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageCollaborationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageCollaborationState_pageId_key" ON "PageCollaborationState"("pageId");
CREATE INDEX "PageCollaborationState_updatedAt_idx" ON "PageCollaborationState"("updatedAt");

ALTER TABLE "PageCollaborationState" ADD CONSTRAINT "PageCollaborationState_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
