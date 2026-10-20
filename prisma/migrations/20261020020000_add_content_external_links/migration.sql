-- CreateTable
CREATE TABLE "ContentExternalLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentExternalLink_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContentExternalLink_siteId_ownerType_ownerId_sortOrder_idx" ON "ContentExternalLink"("siteId", "ownerType", "ownerId", "sortOrder");
