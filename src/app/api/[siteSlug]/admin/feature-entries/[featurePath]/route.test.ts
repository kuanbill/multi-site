import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, siteFeatureFindFirst, entryFindMany, entryCreate, mediaFindFirst } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  siteFeatureFindFirst: vi.fn(),
  entryFindMany: vi.fn(),
  entryCreate: vi.fn(),
  mediaFindFirst: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteFeature: { findFirst: siteFeatureFindFirst },
    featureEntry: { findMany: entryFindMany, create: entryCreate },
    media: { findFirst: mediaFindFirst },
  },
}));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', featurePath: 'faq-center' }) };
const featureSetting = {
  id: 2,
  siteId: 7,
  featureId: 3,
  enabled: true,
  visibility: 'public',
  feature: { id: 3, key: 'faq-center', path: 'faq-center', label: '常見問題' },
};

function requestWith(body: unknown) {
  return new Request('http://localhost/api/site-a/admin/feature-entries/faq-center', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('feature entry collection API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    siteFeatureFindFirst.mockReset().mockResolvedValue(featureSetting);
    entryFindMany.mockReset().mockResolvedValue([]);
    entryCreate.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 9, ...data }));
    mediaFindFirst.mockReset().mockResolvedValue({ id: 44, siteId: 7 });
  });

  it('returns only entries for the current site and feature', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/feature-entries/faq-center'), context);

    expect(response.status).toBe(200);
    expect(siteFeatureFindFirst).toHaveBeenCalledWith({
      where: { siteId: 7, enabled: true, feature: { path: 'faq-center' } },
      select: { featureId: true },
    });
    expect(entryFindMany).toHaveBeenCalledWith({
      where: { siteId: 7, featureId: 3 },
      orderBy: { updatedAt: 'desc' },
      include: { media: { select: { id: true, url: true, altText: true } } },
    });
  });

  it('creates a text entry scoped to the current site and feature', async () => {
    const response = await POST(requestWith({ title: '專案簡介', contentType: 'text', content: '說明內容' }), context);

    expect(response.status).toBe(201);
    expect(entryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        siteId: 7,
        featureId: 3,
        title: '專案簡介',
        content: '說明內容',
        contentType: 'text',
        youtubeUrl: null,
        mediaId: null,
      }),
      include: { media: { select: { id: true, url: true, altText: true } } },
    });
  });

  it('rejects missing titles and malformed YouTube URLs', async () => {
    const missingTitle = await POST(requestWith({ title: '', contentType: 'text', content: '內容' }), context);
    expect(missingTitle.status).toBe(400);

    const badYoutube = await POST(requestWith({ title: '影片', contentType: 'youtube', youtubeUrl: 'https://youtube.com.evil.example/watch?v=bad' }), context);
    expect(badYoutube.status).toBe(400);
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it('rejects image media that does not belong to the current site', async () => {
    mediaFindFirst.mockResolvedValue(null);

    const response = await POST(requestWith({ title: '圖片', contentType: 'image', mediaId: 44 }), context);

    expect(response.status).toBe(400);
    expect(mediaFindFirst).toHaveBeenCalledWith({ where: { id: 44, siteId: 7 }, select: { id: true } });
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it('rejects writes when the feature is disabled', async () => {
    siteFeatureFindFirst.mockResolvedValue(null);

    const response = await POST(requestWith({ title: '文字', contentType: 'text', content: '內容' }), context);

    expect(response.status).toBe(404);
    expect(entryCreate).not.toHaveBeenCalled();
  });
});
