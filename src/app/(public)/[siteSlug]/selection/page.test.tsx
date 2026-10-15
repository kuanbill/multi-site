import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findManySelections = vi.hoisted(() => vi.fn());
const findManyAttachments = vi.hoisted(() => vi.fn());
const findFirstSiteFeature = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    selectionInfo: { findMany: findManySelections },
    contentAttachment: { findMany: findManyAttachments },
    siteFeature: { findFirst: findFirstSiteFeature },
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));

import PublicSelectionPage from './page';

describe('public selection page', () => {
  beforeEach(() => {
    findManySelections.mockReset();
    findManyAttachments.mockReset();
    findFirstSiteFeature.mockReset();
    requirePublicFeature.mockReset();
    requirePublicFeature.mockResolvedValue({ site: { id: 8 }, publishedWhere: { status: 'published' } });
    findManySelections.mockResolvedValue([]);
    findManyAttachments.mockResolvedValue([]);
    findFirstSiteFeature.mockResolvedValue({ displayMode: 'list', feature: { displayMode: 'list' } });
  });

  it('renders a clear empty state when no published selection items exist', async () => {
    const page = await PublicSelectionPage({ params: Promise.resolve({ siteSlug: 'alpha' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('目前尚無已發布資訊');
    expect(requirePublicFeature).toHaveBeenCalledWith('alpha', 'selection');
  });

  it('renders published information, downloadable documents and accessible image previews', async () => {
    findManySelections.mockResolvedValue([{
      id: 12,
      title: '第一期選配說明',
      applicableStage: '權利變換',
      description: '說明內容',
      rules: '選配規則',
      notice: '注意事項',
      deadline: new Date('2026-12-01T00:00:00.000Z'),
      externalUrl: 'https://example.com/selection',
    }]);
    findManyAttachments.mockResolvedValue([
      { id: 1, ownerId: 12, label: '選配辦法.pdf', sortOrder: 0, media: { type: 'pdf', filename: 'guide.pdf', url: '/uploads/guide.pdf', altText: null } },
      { id: 2, ownerId: 12, label: '配置圖', sortOrder: 1, media: { type: 'image', filename: 'plan.png', url: '/uploads/plan.png', altText: '選配配置圖' } },
    ]);

    const page = await PublicSelectionPage({ params: Promise.resolve({ siteSlug: 'alpha' }) });
    const html = renderToStaticMarkup(page);

    expect(findManySelections).toHaveBeenCalledWith(expect.objectContaining({
      where: { siteId: 8, status: 'published' },
    }));
    expect(html).toContain('第一期選配說明');
    expect(html).toContain('選配規則');
    expect(html).toContain('href="/uploads/guide.pdf" download=""');
    expect(html).toContain('src="/uploads/plan.png"');
    expect(html).toContain('alt="選配配置圖"');
  });

  it('uses the configured grid layout for published selection items', async () => {
    findFirstSiteFeature.mockResolvedValue({ displayMode: 'grid', feature: { displayMode: 'list' } });
    findManySelections.mockResolvedValue([{
      id: 13,
      title: '第二期選配說明',
      applicableStage: null,
      description: null,
      rules: null,
      notice: null,
      deadline: null,
      externalUrl: null,
    }]);

    const page = await PublicSelectionPage({ params: Promise.resolve({ siteSlug: 'alpha' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('grid grid-cols-2 md:grid-cols-3 gap-4');
    expect(html).toContain('第二期選配說明');
  });
});
