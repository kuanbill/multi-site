-- CreateTable
CREATE TABLE "SiteHomeSection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "featureId" INTEGER,
    "filter" TEXT NOT NULL DEFAULT 'all',
    "title" TEXT,
    "limit" INTEGER NOT NULL DEFAULT 3,
    "showAll" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiteHomeSection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteHomeSection_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SiteHomeSection_siteId_sortOrder_idx" ON "SiteHomeSection"("siteId", "sortOrder");
