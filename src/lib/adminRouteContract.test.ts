import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('admin route contract', () => {
  it('exposes the dedicated admin login and layout routes', () => {
    expect(existsSync(join(root, 'src/app/(auth)/admin/login/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/admin/layout.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/admin/page.tsx'))).toBe(true);
  });

  it('keeps global management pages and APIs under the admin namespace', () => {
    expect(existsSync(join(root, 'src/app/admin/sites/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/admin/users/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/admin/features/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/api/admin/sites/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/app/api/admin/users/route.ts'))).toBe(true);
    expect(existsSync(join(root, 'src/app/(dashboard)/sites/page.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/app/(dashboard)/users/page.tsx'))).toBe(false);
  });

  it('keeps site management pages under the admin namespace', () => {
    expect(existsSync(join(root, 'src/app/admin/sites/[siteSlug]/page.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/admin/sites/[siteSlug]/layout.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/[siteSlug]/admin/page.tsx'))).toBe(false);
  });

  it('turns the legacy login and register pages into redirects', () => {
    const loginPage = readFileSync(join(root, 'src/app/(auth)/login/page.tsx'), 'utf8');
    const registerPage = readFileSync(join(root, 'src/app/(auth)/register/page.tsx'), 'utf8');

    expect(loginPage).toContain('/admin/login');
    expect(registerPage).toContain('/admin/login');
  });

  it('keeps site and admin client session providers on separate auth base paths', () => {
    const siteProvider = readFileSync(join(root, 'src/components/auth/SiteSessionProvider.tsx'), 'utf8');
    const adminProvider = readFileSync(join(root, 'src/components/auth/AdminSessionProvider.tsx'), 'utf8');
    const siteLogin = readFileSync(join(root, 'src/app/(auth)/[siteSlug]/login/page.tsx'), 'utf8');

    expect(siteProvider).toContain("'/api/auth'");
    expect(adminProvider).toContain("'/api/admin/auth'");
    expect(siteLogin).toContain('SiteSessionProvider');
  });
});
