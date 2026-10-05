-- CreateTable
CREATE TABLE "FeatureView" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "feature" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeatureView_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeatureView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FeatureView_siteId_feature_createdAt_idx" ON "FeatureView"("siteId", "feature", "createdAt");

-- CreateIndex
CREATE INDEX "FeatureView_siteId_userId_createdAt_idx" ON "FeatureView"("siteId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginRecord_createdAt_idx" ON "LoginRecord"("createdAt");

-- CreateIndex
CREATE INDEX "LoginRecord_userId_createdAt_idx" ON "LoginRecord"("userId", "createdAt");
