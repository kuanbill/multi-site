-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeatureDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "displayMode" TEXT NOT NULL DEFAULT 'list',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FeatureDefinition" ("createdAt", "description", "icon", "id", "isSystem", "key", "label", "path") SELECT "createdAt", "description", "icon", "id", "isSystem", "key", "label", "path" FROM "FeatureDefinition";
DROP TABLE "FeatureDefinition";
ALTER TABLE "new_FeatureDefinition" RENAME TO "FeatureDefinition";
CREATE UNIQUE INDEX "FeatureDefinition_key_key" ON "FeatureDefinition"("key");
CREATE TABLE "new_SiteFeature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "displayMode" TEXT NOT NULL DEFAULT 'list',
    CONSTRAINT "SiteFeature_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SiteFeature" ("enabled", "featureId", "id", "siteId", "sortOrder") SELECT "enabled", "featureId", "id", "siteId", "sortOrder" FROM "SiteFeature";
DROP TABLE "SiteFeature";
ALTER TABLE "new_SiteFeature" RENAME TO "SiteFeature";
CREATE UNIQUE INDEX "SiteFeature_siteId_featureId_key" ON "SiteFeature"("siteId", "featureId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
