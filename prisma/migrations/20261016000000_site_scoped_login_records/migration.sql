ALTER TABLE "LoginRecord"
ADD COLUMN "siteId" INTEGER REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LoginRecord_siteId_createdAt_idx" ON "LoginRecord"("siteId", "createdAt");
