import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import AdminShell, { isNestedSiteAdminPath } from './AdminShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
}));

describe('AdminShell', () => {
  it('renders a mobile menu trigger and removes desktop margin on narrow screens', () => {
    const html = renderToStaticMarkup(
      <AdminShell user={{ name: '管理員', role: 'admin' }}>
        <div>內容</div>
      </AdminShell>,
    );

    expect(html).toContain('aria-label="開啟側邊欄"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="admin-sidebar"');
    expect(html).toContain('lg:ml-64');
    expect(html).toContain('ml-0');
  });

  it('recognizes nested site admin routes without hiding the global site list', () => {
    expect(isNestedSiteAdminPath('/admin/sites/zhonghe-renewal')).toBe(true);
    expect(isNestedSiteAdminPath('/admin/sites/zhonghe-renewal/users')).toBe(true);
    expect(isNestedSiteAdminPath('/admin/sites')).toBe(false);
    expect(isNestedSiteAdminPath('/admin/sites/new')).toBe(false);
  });

  it('uses the same close path for Escape so focus can return to the menu trigger', () => {
    const source = readFileSync(new URL('./AdminShell.tsx', import.meta.url), 'utf8');

    expect(source).toContain("if (event.key === 'Escape') closeMobileMenu()");
  });
});
