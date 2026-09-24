-- CreateTable
CREATE TABLE "FeatureEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "youtubeUrl" TEXT,
    "mediaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeatureEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureEntry_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureEntry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FeatureEntry_siteId_featureId_idx" ON "FeatureEntry"("siteId", "featureId");

-- CreateIndex
CREATE INDEX "FeatureEntry_mediaId_idx" ON "FeatureEntry"("mediaId");
