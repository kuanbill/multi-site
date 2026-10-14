PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SelectionInfo" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SelectionInfo_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_SelectionInfo" (
    "id", "siteId", "title", "description", "applicableStage", "rules", "notice", "deadline",
    "externalUrl", "status", "publishedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "siteId", "title", "description", "applicableStage", "rules", "notice", "deadline",
    "externalUrl", "status", "publishedAt", "updatedAt", "updatedAt"
FROM "SelectionInfo";

DROP TABLE "SelectionInfo";
ALTER TABLE "new_SelectionInfo" RENAME TO "SelectionInfo";
CREATE INDEX "SelectionInfo_siteId_idx" ON "SelectionInfo"("siteId");
UPDATE "FeatureDefinition" SET "label" = '選配作業' WHERE "key" = 'selection';

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
