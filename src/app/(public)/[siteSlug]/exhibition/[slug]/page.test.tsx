import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirstExhibition = vi.hoisted(() => vi.fn());
const findManyAttachments = vi.hoisted(() => vi.fn());
const findManyExternalLinks = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exhibition: { findFirst: findFirstExhibition },
    contentAttachment: { findMany: findManyAttachments },
    contentExternalLink: { findMany: findManyExternalLinks },
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));

import PublicExhibitionDetailPage from './page';

describe('public exhibition detail page', () => {
  beforeEach(() => {
    requirePublicFeature.mockReset().mockResolvedValue({ site: { id: 7, name: '測試站點' } });
    findFirstExhibition.mockReset().mockResolvedValue({
      id: 5,
      siteId: 7,
      slug: 'expo',
      title: '已發布展覽',
      startDate: null,
      endDate: null,
      location: null,
      description: null,
      feedbackSummary: null,
      status: 'published',
    });
    findManyAttachments.mockReset().mockResolvedValue([{
      id: 3,
      media: { type: 'pdf', mimeType: 'application/pdf', url: '/uploads/expo.pdf', filename: 'expo.pdf', altText: null },
    }]);
    findManyExternalLinks.mockReset().mockResolvedValue([
      { id: 1, url: 'https://drive.google.com/file/d/one/view', sortOrder: 0 },
    ]);
  });

  it('renders Google Drive links alongside existing media attachments', async () => {
    const page = await PublicExhibitionDetailPage({ params: Promise.resolve({ siteSlug: 'site-a', slug: 'expo' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('展覽圖庫');
    expect(html).toContain('相關 PDF');
    expect(html).toContain('href="https://drive.google.com/file/d/one/view"');
  });
});
