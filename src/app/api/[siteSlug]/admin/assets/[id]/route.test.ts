import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  unlink,
  requireContentPermission,
  mediaFindFirst,
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
  const mediaDelete = vi.fn();
  const homeFindFirst = vi.fn();
  const vendorFindFirst = vi.fn();
  const mapFindFirst = vi.fn();
  const attachmentFindFirst = vi.fn();
  const featureEntryFindFirst = vi.fn();
  const transaction = vi.fn();
  return { unlink, requireContentPermission, mediaFindFirst, mediaDelete, homeFindFirst, vendorFindFirst, mapFindFirst, attachmentFindFirst, featureEntryFindFirst, transaction };
});

vi.mock('node:fs/promises', () => ({ unlink }));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission, canPerformContentAction: () => true }));
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction } }));

import { DELETE } from './route';

describe('site media deletion', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'admin' });
    mediaFindFirst.mockReset().mockResolvedValue({ id: 44, filename: 'image.jpg' });
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
