-- Preserve the existing unique A/B index while aligning the implicit relation
-- with Prisma's canonical primary-key representation. This is metadata-only:
-- PostgreSQL reuses the validated unique index and no rows are rewritten.
ALTER TABLE "_PageToPageTag"
ADD CONSTRAINT "_PageToPageTag_AB_pkey"
PRIMARY KEY USING INDEX "_PageToPageTag_AB_unique";
