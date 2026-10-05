import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  unlink,
  requireContentPermission,
  mediaFindFirst,
  mediaUpdate,
  mediaDelete,
  homeFindFirst,
  vendorFindFirst,
  mapFindFirst,
  attachmentFindFirst,
  featureEntryFindFirst,
  transaction,
} = vi.hoisted(() => {
  const unlink = vi.fn();
  const requireContentPermission = vi.fn();
  const mediaFindFirst = vi.fn();
  const mediaUpdate = vi.fn();
  const mediaDelete = vi.fn();
  const homeFindFirst = vi.fn();
  const vendorFindFirst = vi.fn();
  const mapFindFirst = vi.fn();
  const attachmentFindFirst = vi.fn();
  const featureEntryFindFirst = vi.fn();
  const transaction = vi.fn();
  return { unlink, requireContentPermission, mediaFindFirst, mediaUpdate, mediaDelete, homeFindFirst, vendorFindFirst, mapFindFirst, attachmentFindFirst, featureEntryFindFirst, transaction };
});

vi.mock('node:fs/promises', () => ({ unlink }));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission, canPerformContentAction: () => true }));
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction, media: { findFirst: mediaFindFirst, update: mediaUpdate } } }));

import { DELETE, PATCH } from './route';

describe('site media deletion', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'admin' });
    mediaFindFirst.mockReset().mockResolvedValue({ id: 44, filename: 'image.jpg' });
    mediaUpdate.mockReset().mockResolvedValue({ id: 44, altText: '新說明' });
    mediaDelete.mockReset().mockResolvedValue({ id: 44 });
    homeFindFirst.mockReset().mockResolvedValue(null);
    vendorFindFirst.mockReset().mockResolvedValue(null);
    mapFindFirst.mockReset().mockResolvedValue(null);
    attachmentFindFirst.mockReset().mockResolvedValue(null);
    featureEntryFindFirst.mockReset().mockResolvedValue(null);
    unlink.mockReset().mockResolvedValue(undefined);
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      media: { findFirst: mediaFindFirst, delete: mediaDelete },
      siteHome: { findFirst: homeFindFirst },
      vendor: { findFirst: vendorFindFirst },
      mapAsset: { findFirst: mapFindFirst },
      contentAttachment: { findFirst: attachmentFindFirst },
      featureEntry: { findFirst: featureEntryFindFirst },
    }));
  });

  it('allows a site editor to delete media of their own site', async () => {
    requireContentPermission.mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });

    const response = await DELETE(new Request('http://localhost/api/site-a/admin/assets/44', { method: 'DELETE' }), {
      params: Promise.resolve({ siteSlug: 'site-a', id: '44' }),
    });

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    expect(mediaDelete).toHaveBeenCalledWith({ where: { id: 44 } });
    expect(unlink).toHaveBeenCalled();
  });

  it('rejects deleting media referenced by a feature entry', async () => {
    featureEntryFindFirst.mockResolvedValue({ id: 9 });

    const response = await DELETE(new Request('http://localhost/api/site-a/admin/assets/44', { method: 'DELETE' }), {
      params: Promise.resolve({ siteSlug: 'site-a', id: '44' }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: '媒體仍被內容引用，請先解除引用' });
    expect(mediaDelete).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });
});

describe('site media update', () => {
  const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '44' }) };

  function patch(body: unknown) {
    return PATCH(new Request('http://localhost/api/site-a/admin/assets/44', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }), context);
  }

  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'admin' });
    mediaFindFirst.mockReset().mockResolvedValue({ id: 44, filename: 'image.jpg', altText: '舊說明' });
    mediaUpdate.mockReset().mockResolvedValue({ id: 44, altText: '新說明' });
  });

  it('updates the alt text of site-scoped media', async () => {
    const response = await patch({ altText: '新說明' });

    expect(response.status).toBe(200);
    expect(mediaFindFirst).toHaveBeenCalledWith({ where: { id: 44, siteId: 7 } });
    expect(mediaUpdate).toHaveBeenCalledWith({ where: { id: 44 }, data: { altText: '新說明' } });
  });

  it('clears the alt text when null is sent', async () => {
    const response = await patch({ altText: null });

    expect(response.status).toBe(200);
    expect(mediaUpdate).toHaveBeenCalledWith({ where: { id: 44 }, data: { altText: null } });
  });

  it('rejects a non-string alt text', async () => {
    const response = await patch({ altText: 123 });

    expect(response.status).toBe(400);
    expect(mediaUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 for media belonging to another site', async () => {
    mediaFindFirst.mockResolvedValue(null);

    const response = await patch({ altText: '新說明' });

    expect(response.status).toBe(404);
    expect(mediaUpdate).not.toHaveBeenCalled();
  });
});
