import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirstAnnouncement = vi.hoisted(() => vi.fn());
const findManyExternalLinks = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    announcement: { findFirst: findFirstAnnouncement },
    contentExternalLink: { findMany: findManyExternalLinks },
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));

import PublicAnnouncementDetailPage from './page';

describe('public announcement detail page', () => {
  beforeEach(() => {
    findFirstAnnouncement.mockReset().mockResolvedValue({
      id: 12,
      siteId: 7,
      slug: 'announcement-abc123def456',
      title: '已發布公告',
      summary: null,
      content: '公告內容',
      category: null,
      pinned: false,
      status: 'published',
      publishedAt: new Date('2026-10-20T00:00:00.000Z'),
    });
    findManyExternalLinks.mockReset().mockResolvedValue([
      { id: 1, url: 'https://drive.google.com/file/d/one/view', sortOrder: 0 },
      { id: 2, url: 'https://drive.google.com/file/d/two/view', sortOrder: 1 },
    ]);
    requirePublicFeature.mockReset().mockResolvedValue({ site: { id: 7, name: '測試站點' } });
  });

  it('renders published Google Drive links in a new tab', async () => {
    const page = await PublicAnnouncementDetailPage({
      params: Promise.resolve({ siteSlug: 'site-a', slug: 'announcement-abc123def456' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('相關 PDF');
    expect(html).toContain('href="https://drive.google.com/file/d/one/view"');
    expect(html).toContain('target="_blank"');
    expect((html.match(/target="_blank"/g) ?? []).length).toBe(2);
  });
});
