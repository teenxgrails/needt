-- Personal focused Mail splits. They intentionally do not carry a workspace
-- scope or grants: each rule is visible only to its owning user.
CREATE TABLE "MailFocusedSplit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailFocusedSplit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MailFocusedSplit_userId_senderAddress_key"
    ON "MailFocusedSplit"("userId", "senderAddress");

CREATE INDEX "MailFocusedSplit_userId_position_idx"
    ON "MailFocusedSplit"("userId", "position");

ALTER TABLE "MailFocusedSplit"
    ADD CONSTRAINT "MailFocusedSplit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
