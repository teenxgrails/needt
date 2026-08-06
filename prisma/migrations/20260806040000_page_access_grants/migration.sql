-- Direct per-page permissions override inherited workspace roles.
CREATE TYPE "PageAccessRole" AS ENUM ('FULL_ACCESS', 'EDITOR', 'VIEWER');

CREATE TABLE "PageAccessGrant" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PageAccessRole" NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageAccessGrant_pageId_userId_key" ON "PageAccessGrant"("pageId", "userId");
CREATE INDEX "PageAccessGrant_userId_role_idx" ON "PageAccessGrant"("userId", "role");
CREATE INDEX "PageAccessGrant_grantedById_idx" ON "PageAccessGrant"("grantedById");

ALTER TABLE "PageAccessGrant" ADD CONSTRAINT "PageAccessGrant_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageAccessGrant" ADD CONSTRAINT "PageAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageAccessGrant" ADD CONSTRAINT "PageAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
