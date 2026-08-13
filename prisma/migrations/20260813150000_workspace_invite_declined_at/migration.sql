-- Preserve declined invitations for auditability instead of deleting them.
ALTER TABLE "WorkspaceInvite" ADD COLUMN "declinedAt" TIMESTAMP(3);
