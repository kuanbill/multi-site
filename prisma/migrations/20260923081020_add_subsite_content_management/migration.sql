-- AlterTable
ALTER TABLE "Media" ADD COLUMN "altText" TEXT;
ALTER TABLE "Media" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Media" ADD COLUMN "sizeBytes" INTEGER;

-- CreateTable
CREATE TABLE "SiteHome" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "tagline" TEXT,
    "intro" TEXT,
    "heroMediaId" INTEGER,
    "currentStage" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactAddress" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiteHome_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteHome_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "category" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "stageDate" DATETIME NOT NULL,
    "stageLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "progressStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exhibition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "location" TEXT,
    "description" TEXT,
    "feedbackSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exhibition_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "meetingType" TEXT NOT NULL,
    "meetingNo" TEXT,
    "title" TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "services" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "logoMediaId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vendor_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SelectionInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "applicableStage" TEXT,
    "rules" TEXT,
    "notice" TEXT,
    "deadline" DATETIME,
    "externalUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SelectionInfo_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "imageMediaId" INTEGER,
    "downloadMediaId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapAsset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapAsset_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapAsset_downloadMediaId_fkey" FOREIGN KEY ("downloadMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentAttachment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentAttachment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteFeature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "displayMode" TEXT NOT NULL DEFAULT 'list',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    CONSTRAINT "SiteFeature_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SiteFeature" ("displayMode", "enabled", "featureId", "id", "siteId", "sortOrder") SELECT "displayMode", "enabled", "featureId", "id", "siteId", "sortOrder" FROM "SiteFeature";
DROP TABLE "SiteFeature";
ALTER TABLE "new_SiteFeature" RENAME TO "SiteFeature";
CREATE UNIQUE INDEX "SiteFeature_siteId_featureId_key" ON "SiteFeature"("siteId", "featureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SiteHome_siteId_key" ON "SiteHome"("siteId");

-- CreateIndex
CREATE INDEX "Announcement_siteId_idx" ON "Announcement"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_siteId_slug_key" ON "Announcement"("siteId", "slug");

-- CreateIndex
CREATE INDEX "ProgressItem_siteId_idx" ON "ProgressItem"("siteId");

-- CreateIndex
CREATE INDEX "Exhibition_siteId_idx" ON "Exhibition"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibition_siteId_slug_key" ON "Exhibition"("siteId", "slug");

-- CreateIndex
CREATE INDEX "MeetingRecord_siteId_idx" ON "MeetingRecord"("siteId");

-- CreateIndex
CREATE INDEX "Vendor_siteId_idx" ON "Vendor"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionInfo_siteId_key" ON "SelectionInfo"("siteId");

-- CreateIndex
CREATE INDEX "MapAsset_siteId_idx" ON "MapAsset"("siteId");

-- CreateIndex
CREATE INDEX "ContentAttachment_siteId_idx" ON "ContentAttachment"("siteId");

-- CreateIndex
CREATE INDEX "ContentAttachment_ownerType_ownerId_idx" ON "ContentAttachment"("ownerType", "ownerId");
