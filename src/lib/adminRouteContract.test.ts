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

  it('turns the legacy login and register pages into redirects', () => {
    const loginPage = readFileSync(join(root, 'src/app/(auth)/login/page.tsx'), 'utf8');
    const registerPage = readFileSync(join(root, 'src/app/(auth)/register/page.tsx'), 'utf8');

    expect(loginPage).toContain('/admin/login');
    expect(registerPage).toContain('/admin/login');
  });
});
