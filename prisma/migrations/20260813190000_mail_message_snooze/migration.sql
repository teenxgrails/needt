-- Additive local inbox state. Snooze intentionally does not mutate a remote
-- provider because Gmail, Outlook and IMAP have incompatible semantics.
ALTER TABLE "MailMessage" ADD COLUMN "snoozedUntil" TIMESTAMP(3);

CREATE INDEX "MailMessage_accountId_isArchived_snoozedUntil_idx"
ON "MailMessage"("accountId", "isArchived", "snoozedUntil");
