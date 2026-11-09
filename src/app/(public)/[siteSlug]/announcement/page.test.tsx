import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findManyAnnouncements = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());
const getFeatureDisplayMode = vi.hoisted(() => vi.fn());

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { announcement: { findMany: findManyAnnouncements } },
}));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));
vi.mock('@/lib/site', () => ({ getFeatureDisplayMode }));

import PublicAnnouncementListPage from './page';

describe('public announcement list page', () => {
  beforeEach(() => {
    findManyAnnouncements.mockReset().mockResolvedValue([
      {
        id: 1,
        slug: 'notice',
        title: '公告標題',
        summary: null,
        category: '一般公告',
        pinned: false,
        publishedAt: new Date('2026-10-20T00:00:00.000Z'),
      },
    ]);
    requirePublicFeature.mockReset().mockResolvedValue({ site: { id: 7, name: '測試站點' } });
    getFeatureDisplayMode.mockReset().mockResolvedValue('list');
  });

  it('labels the publish date and does not render the category', async () => {
    const page = await PublicAnnouncementListPage({ params: Promise.resolve({ siteSlug: 'site-a' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('發布日期：2026/10/20');
    expect(html).not.toContain('一般公告');
  });
});
