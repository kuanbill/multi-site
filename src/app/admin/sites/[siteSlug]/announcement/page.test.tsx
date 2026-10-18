import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, announcementFindMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  announcementFindMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({ prisma: { announcement: { findMany: announcementFindMany } } }));
vi.mock('./DeleteButton', () => ({
  default: () => <button type="button">刪除</button>,
}));

import AnnouncementListPage from './page';

describe('AnnouncementListPage', () => {
  beforeEach(() => {
    requireContentPermission.mockResolvedValue({
      site: { id: 7, name: '測試站點' },
      siteRole: 'global-admin',
    });
    announcementFindMany.mockResolvedValue([
      {
        id: 12,
        title: '公告標題',
        summary: null,
        category: null,
        status: 'draft',
        pinned: false,
        sortOrder: 0,
        updatedAt: new Date('2026-10-18T00:00:00Z'),
      },
    ]);
  });

  it('keeps the edit action reachable when the table is wider than a phone viewport', async () => {
    const html = renderToStaticMarkup(
      await AnnouncementListPage({ params: Promise.resolve({ siteSlug: 'site-a' }) }),
    );

    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('/admin/sites/site-a/announcement/12/edit');
  });
});
