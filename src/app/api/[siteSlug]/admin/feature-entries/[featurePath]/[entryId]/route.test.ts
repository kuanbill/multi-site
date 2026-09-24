import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, siteFeatureFindFirst, entryFindFirst, entryUpdate, entryDelete, mediaFindFirst } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  siteFeatureFindFirst: vi.fn(),
  entryFindFirst: vi.fn(),
  entryUpdate: vi.fn(),
  entryDelete: vi.fn(),
  mediaFindFirst: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteFeature: { findFirst: siteFeatureFindFirst },
    featureEntry: { findFirst: entryFindFirst, update: entryUpdate, delete: entryDelete },
    media: { findFirst: mediaFindFirst },
  },
}));

import { DELETE, GET, PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', featurePath: 'faq-center', entryId: '9' }) };
const featureSetting = { featureId: 3 };
const entry = {
  id: 9,
  siteId: 7,
  featureId: 3,
  title: '專案簡介',
  content: '原內容',
  contentType: 'text',
  youtubeUrl: null,
  mediaId: null,
  media: null,
};

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/site-a/admin/feature-entries/faq-center/9', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('feature entry detail API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    siteFeatureFindFirst.mockReset().mockResolvedValue(featureSetting);
    entryFindFirst.mockReset().mockResolvedValue(entry);
    entryUpdate.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...entry, ...data }));
    entryDelete.mockReset().mockResolvedValue(entry);
    mediaFindFirst.mockReset().mockResolvedValue({ id: 44, siteId: 7 });
  });

  it('only reads an entry scoped to this site and feature', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/feature-entries/faq-center/9'), context);

    expect(response.status).toBe(200);
    expect(entryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9, siteId: 7, featureId: 3 },
    }));
  });

  it('returns not found for an entry outside the current site/feature scope', async () => {
    entryFindFirst.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/site-a/admin/feature-entries/faq-center/9'), context);

    expect(response.status).toBe(404);
  });

  it('patches an entry and uses write permission for editor deletion', async () => {
    const patchResponse = await PATCH(patchRequest({ content: '更新內容' }), context);

    expect(patchResponse.status).toBe(200);
    expect(entryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9 },
      data: expect.objectContaining({ title: '專案簡介', content: '更新內容', contentType: 'text' }),
    }));

    const deleteResponse = await DELETE(new Request('http://localhost/api/site-a/admin/feature-entries/faq-center/9', { method: 'DELETE' }), context);

    expect(deleteResponse.status).toBe(200);
    expect(requireContentPermission).toHaveBeenLastCalledWith('site-a', 'write');
    expect(entryDelete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('rejects an invalid replacement media id without changing the entry', async () => {
    mediaFindFirst.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ contentType: 'image', mediaId: 44 }), context);

    expect(response.status).toBe(400);
    expect(entryUpdate).not.toHaveBeenCalled();
  });
});
