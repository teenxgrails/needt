-- Keep saved views referentially coherent when boards are removed.
UPDATE "SavedView"
SET "boardId" = NULL
WHERE "boardId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Board" WHERE "Board"."id" = "SavedView"."boardId"
  );

ALTER TABLE "SavedView"
ADD CONSTRAINT "SavedView_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "Board"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Finish the user-visible rebrand for customization records and defaults.
UPDATE "UserCustomization"
SET "themePreset" = 'needt'
WHERE "themePreset" = 'flowday';

ALTER TABLE "UserCustomization"
ALTER COLUMN "themePreset" SET DEFAULT 'needt';
