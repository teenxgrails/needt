ALTER TYPE "SchedulingRunSource" ADD VALUE 'MEETING_PROPOSAL';
CREATE TYPE "MeetingProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

CREATE TABLE "MeetingNoteProposal" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "createdById" TEXT,
  "summary" TEXT NOT NULL,
  "actions" JSONB NOT NULL,
  "actionVersion" INTEGER NOT NULL DEFAULT 1,
  "status" "MeetingProposalStatus" NOT NULL DEFAULT 'PENDING',
  "pageUpdatedAt" TIMESTAMP(3) NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "schedulingRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingNoteProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MeetingNoteProposal_workspaceId_status_createdAt_idx" ON "MeetingNoteProposal"("workspaceId", "status", "createdAt");
CREATE INDEX "MeetingNoteProposal_pageId_createdAt_idx" ON "MeetingNoteProposal"("pageId", "createdAt");
CREATE INDEX "MeetingNoteProposal_createdById_idx" ON "MeetingNoteProposal"("createdById");

ALTER TABLE "MeetingNoteProposal" ADD CONSTRAINT "MeetingNoteProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingNoteProposal" ADD CONSTRAINT "MeetingNoteProposal_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingNoteProposal" ADD CONSTRAINT "MeetingNoteProposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingNoteProposal" ADD CONSTRAINT "MeetingNoteProposal_actionVersion_check" CHECK ("actionVersion" = 1);
