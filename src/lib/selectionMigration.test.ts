import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const Database = createRequire(import.meta.url)('better-sqlite3');
const migrationRoot = join(process.cwd(), 'prisma/migrations');
const selectionMigration = '20261014000000_selection_items';

describe('selection items migration', () => {
  it('preserves an existing selection and allows multiple selections per site', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    try {
      const migrationDirectories = readdirSync(migrationRoot)
        .filter((name) => statSync(join(migrationRoot, name)).isDirectory())
        .filter((name) => name < selectionMigration)
        .sort();

      for (const directory of migrationDirectories) {
        db.exec(readFileSync(join(migrationRoot, directory, 'migration.sql'), 'utf8'));
      }

      const siteId = Number(
        db.prepare('INSERT INTO "Site" ("name", "slug", "updatedAt") VALUES (?, ?, ?)')
          .run('Site A', 'site-a', '2026-10-14').lastInsertRowid,
      );
      db.prepare('INSERT INTO "FeatureDefinition" ("key", "label", "path", "isSystem") VALUES (?, ?, ?, ?)')
        .run('selection', '正式選配', 'selection', 1);
      const original = {
        title: '既有選配說明',
        description: '保留的說明',
        applicableStage: '權利變換',
        rules: '原規則',
        notice: '原注意事項',
        deadline: '2026-12-01 00:00:00',
        externalUrl: 'https://example.com/selection',
        status: 'published',
        publishedAt: '2026-09-01 00:00:00',
        updatedAt: '2026-09-01 00:00:00',
      };
      const originalId = Number(
        db.prepare(`INSERT INTO "SelectionInfo"
          ("siteId", "title", "description", "applicableStage", "rules", "notice", "deadline", "externalUrl", "status", "publishedAt", "updatedAt")
          VALUES (@siteId, @title, @description, @applicableStage, @rules, @notice, @deadline, @externalUrl, @status, @publishedAt, @updatedAt)`)
          .run({ siteId, ...original }).lastInsertRowid,
      );

      db.exec(readFileSync(join(migrationRoot, selectionMigration, 'migration.sql'), 'utf8'));

      const migrated = db.prepare('SELECT * FROM "SelectionInfo" WHERE "id" = ?').get(originalId) as Record<string, unknown>;
      expect(migrated).toMatchObject({ id: originalId, siteId, ...original });
      expect(migrated.createdAt).toBeTruthy();
      expect(db.prepare('SELECT "label" FROM "FeatureDefinition" WHERE "key" = ?').get('selection'))
        .toEqual({ label: '選配作業' });

      expect(() => db.prepare(`INSERT INTO "SelectionInfo" ("siteId", "title", "updatedAt") VALUES (?, ?, ?)`)
        .run(siteId, '第二筆選配', '2026-10-14')).not.toThrow();
    } finally {
      db.close();
    }
  });
});
