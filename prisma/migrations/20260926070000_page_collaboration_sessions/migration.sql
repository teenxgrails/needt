CREATE TABLE "PageCollaborationSession" (
    "pageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageCollaborationSession_pkey" PRIMARY KEY ("pageId", "sessionId")
);

CREATE INDEX "PageCollaborationSession_expiresAt_idx"
ON "PageCollaborationSession"("expiresAt");

ALTER TABLE "PageCollaborationSession"
ADD CONSTRAINT "PageCollaborationSession_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
