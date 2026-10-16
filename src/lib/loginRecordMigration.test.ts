import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const Database = createRequire(import.meta.url)('better-sqlite3');
const migrationRoot = join(process.cwd(), 'prisma/migrations');
const scopedLoginMigration = '20261016000000_site_scoped_login_records';

describe('site-scoped login record migration', () => {
  it('preserves old global records and supports site-associated records', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    try {
      const migrationDirectories = readdirSync(migrationRoot)
        .filter((name) => statSync(join(migrationRoot, name)).isDirectory())
        .filter((name) => name < scopedLoginMigration)
        .sort();

      for (const directory of migrationDirectories) {
        db.exec(readFileSync(join(migrationRoot, directory, 'migration.sql'), 'utf8'));
      }

      const siteId = Number(
        db.prepare('INSERT INTO "Site" ("name", "slug", "updatedAt") VALUES (?, ?, ?)')
          .run('Site A', 'site-a', '2026-10-16').lastInsertRowid,
      );
      const userId = Number(
        db.prepare(`INSERT INTO "User" ("email", "name", "password", "updatedAt")
          VALUES (?, ?, ?, ?)`)
          .run('member@example.com', 'Site Member', 'hashed-password', '2026-10-16').lastInsertRowid,
      );
      const oldRecordId = Number(
        db.prepare('INSERT INTO "LoginRecord" ("userId", "createdAt") VALUES (?, ?)')
          .run(userId, '2026-10-15 10:00:00').lastInsertRowid,
      );

      db.exec(readFileSync(join(migrationRoot, scopedLoginMigration, 'migration.sql'), 'utf8'));

      expect(db.prepare('SELECT "userId", "siteId" FROM "LoginRecord" WHERE "id" = ?').get(oldRecordId))
        .toEqual({ userId, siteId: null });

      const scopedRecordId = Number(
        db.prepare('INSERT INTO "LoginRecord" ("userId", "siteId", "createdAt") VALUES (?, ?, ?)')
          .run(userId, siteId, '2026-10-16 10:00:00').lastInsertRowid,
      );
      expect(db.prepare('SELECT "siteId" FROM "LoginRecord" WHERE "id" = ?').get(scopedRecordId))
        .toEqual({ siteId });

      db.prepare('DELETE FROM "Site" WHERE "id" = ?').run(siteId);
      expect(db.prepare('SELECT "siteId" FROM "LoginRecord" WHERE "id" = ?').get(scopedRecordId))
        .toEqual({ siteId: null });
    } finally {
      db.close();
    }
  });
});
