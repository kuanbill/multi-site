import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirstVendor = vi.hoisted(() => vi.fn());
const findManyAttachments = vi.hoisted(() => vi.fn());
const findManyExternalLinks = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { vendor: { findFirst: findFirstVendor }, contentAttachment: { findMany: findManyAttachments }, contentExternalLink: { findMany: findManyExternalLinks } } }));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));
import PublicVendorDetailPage from './page';

describe('public vendor detail page', () => {
  beforeEach(() => {
    requirePublicFeature.mockReset().mockResolvedValue({ site: { id: 7, name: '測試站點' }, publishedWhere: { status: 'published' } });
    findFirstVendor.mockReset().mockResolvedValue({ id: 3, siteId: 7, name: '已發布廠商', category: '工程', status: 'published', logoMedia: null });
    findManyAttachments.mockReset().mockResolvedValue([]);
    findManyExternalLinks.mockReset().mockResolvedValue([{ id: 1, url: 'https://drive.google.com/file/d/vendor/view', sortOrder: 0 }]);
  });

  it('renders published vendor Drive links', async () => {
    const page = await PublicVendorDetailPage({ params: Promise.resolve({ siteSlug: 'site-a', id: '3' }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('相關 PDF');
    expect(html).toContain('href="https://drive.google.com/file/d/vendor/view"');
  });
});
