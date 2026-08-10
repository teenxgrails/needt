-- Public Page links are separate, revocable, read-only bearer URLs.
CREATE TABLE "PagePublication" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagePublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PagePublication_pageId_key" ON "PagePublication"("pageId");
CREATE UNIQUE INDEX "PagePublication_token_key" ON "PagePublication"("token");
CREATE INDEX "PagePublication_revokedAt_idx" ON "PagePublication"("revokedAt");
CREATE INDEX "PagePublication_publishedById_idx" ON "PagePublication"("publishedById");

ALTER TABLE "PagePublication" ADD CONSTRAINT "PagePublication_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PagePublication" ADD CONSTRAINT "PagePublication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
