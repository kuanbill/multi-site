import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, getSiteFeatures, isSiteMember, loadSectionRows } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getSiteFeatures: vi.fn(),
  isSiteMember: vi.fn(),
  loadSectionRows: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/site', () => ({ getSiteFeatures }));
vi.mock('@/lib/siteLogin', () => ({ isSiteMember }));
vi.mock('@/lib/homeSectionQueries', () => ({ loadSectionRows }));

import HomeSections from './HomeSections';

describe('HomeSections', () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue(null);
    getSiteFeatures.mockResolvedValue([
      {
        enabled: true,
        visibility: 'public',
        feature: { id: 2, key: 'announcements', label: '公告欄', path: 'announcement' },
      },
    ]);
    isSiteMember.mockReturnValue(false);
    loadSectionRows.mockResolvedValue([
      {
        id: 1,
        title: '公告標題',
        slug: 'notice',
        summary: null,
        content: null,
        category: null,
        pinned: false,
        publishedAt: new Date('2026-10-18T00:00:00Z'),
      },
    ]);
  });

  it('renders an announcement date before its title on the homepage', async () => {
    const html = renderToStaticMarkup(
      await HomeSections({
        siteId: 1,
        siteSlug: 'site-a',
        sections: [{ id: 1, sourceType: 'announcement', featureId: null, filter: 'all', title: '最新公告', limit: 3, showAll: true, sortOrder: 0 }],
      }),
    );

    expect(html.indexOf('2026/10/18')).toBeLessThan(html.indexOf('公告標題'));
  });
});
