import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const Database = createRequire(import.meta.url)('better-sqlite3');

function createMigratedDatabase() {
  const migrationRoot = join(process.cwd(), 'prisma/migrations');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const migrationDirectories = readdirSync(migrationRoot)
    .filter((name) => statSync(join(migrationRoot, name)).isDirectory())
    .sort();

  for (const directory of migrationDirectories) {
    db.exec(readFileSync(join(migrationRoot, directory, 'migration.sql'), 'utf8'));
  }
  return db;
}

describe('FeatureEntry migration', () => {
  it('creates the feature-entry schema and enforces cascade/restrict relations', () => {
    const db = createMigratedDatabase();

    try {
      const columns = new Set(
        (db.pragma('table_info("FeatureEntry")') as Array<{ name: string }>).map((column) => column.name),
      );
      for (const column of ['siteId', 'featureId', 'title', 'content', 'contentType', 'youtubeUrl', 'mediaId', 'createdAt', 'updatedAt']) {
        expect(columns.has(column), `missing FeatureEntry.${column}`).toBe(true);
      }

      const siteId = Number(
        db.prepare('INSERT INTO "Site" ("name", "slug", "updatedAt") VALUES (?, ?, ?)')
          .run('Site A', 'site-a', '2026-09-24').lastInsertRowid,
      );
      const textFeatureId = Number(
        db.prepare('INSERT INTO "FeatureDefinition" ("key", "label", "path") VALUES (?, ?, ?)')
          .run('faq-center', 'FAQ', 'faq-center').lastInsertRowid,
      );
      db.prepare('INSERT INTO "FeatureEntry" ("siteId", "featureId", "title", "contentType", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)')
        .run(siteId, textFeatureId, 'Entry', 'text', '2026-09-24', '2026-09-24');

      db.prepare('DELETE FROM "FeatureDefinition" WHERE "id" = ?').run(textFeatureId);
      expect(db.prepare('SELECT COUNT(*) AS count FROM "FeatureEntry"').get()).toEqual({ count: 0 });

      const imageFeatureId = Number(
        db.prepare('INSERT INTO "FeatureDefinition" ("key", "label", "path") VALUES (?, ?, ?)')
          .run('gallery', 'Gallery', 'gallery').lastInsertRowid,
      );
      const mediaId = Number(
        db.prepare('INSERT INTO "Media" ("siteId", "filename", "url", "type") VALUES (?, ?, ?, ?)')
          .run(siteId, 'image.jpg', '/uploads/image.jpg', 'image').lastInsertRowid,
      );
      db.prepare('INSERT INTO "FeatureEntry" ("siteId", "featureId", "title", "contentType", "mediaId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(siteId, imageFeatureId, 'Photo', 'image', mediaId, '2026-09-24', '2026-09-24');

      expect(() => db.prepare('DELETE FROM "Media" WHERE "id" = ?').run(mediaId)).toThrow();
    } finally {
      db.close();
    }
  });
});
