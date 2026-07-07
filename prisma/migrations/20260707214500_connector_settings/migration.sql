CREATE TABLE "ConnectorSettings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT,
    "tokenPreview" TEXT,
    "webhookUrl" TEXT,
    "webhookSchedule" BOOLEAN NOT NULL DEFAULT false,
    "webhookTaskComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConnectorSettings_userId_key" ON "ConnectorSettings"("userId");
CREATE UNIQUE INDEX "ConnectorSettings_tokenHash_key" ON "ConnectorSettings"("tokenHash");
CREATE INDEX "ConnectorSettings_userId_idx" ON "ConnectorSettings"("userId");
CREATE INDEX "ConnectorSettings_tokenHash_idx" ON "ConnectorSettings"("tokenHash");

ALTER TABLE "ConnectorSettings"
ADD CONSTRAINT "ConnectorSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ConnectorSettings" ("id", "userId", "updatedAt")
SELECT gen_random_uuid(), "id", CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("userId") DO NOTHING;
