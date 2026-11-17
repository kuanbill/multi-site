import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireContentPermission,
  mapFindFirst,
  mapDelete,
  attachmentFindMany,
  attachmentDeleteMany,
  mediaFindMany,
  mediaDelete,
  transaction,
  unlink,
} = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  mapFindFirst: vi.fn(),
  mapDelete: vi.fn(),
  attachmentFindMany: vi.fn(),
  attachmentDeleteMany: vi.fn(),
  mediaFindMany: vi.fn(),
  mediaDelete: vi.fn(),
  transaction: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ unlink }));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    mapAsset: { findFirst: mapFindFirst },
    contentAttachment: { findMany: attachmentFindMany },
    media: { findMany: mediaFindMany },
    $transaction: transaction,
  },
}));

import { DELETE } from './route';

const params = { params: Promise.resolve({ siteSlug: 'site-a', id: '5' }) };
const existing = {
  id: 5,
  siteId: 7,
  imageMediaId: 11,
  downloadMediaId: 12,
};

describe('map asset delete API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 } });
    mapFindFirst.mockReset().mockResolvedValue(existing);
    attachmentFindMany.mockReset().mockResolvedValue([]);
    mediaFindMany.mockReset().mockResolvedValue([
      { id: 11, filename: 'image.png' },
      { id: 12, filename: 'download.pdf' },
    ]);
    mapDelete.mockReset().mockResolvedValue(existing);
    attachmentDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mediaDelete.mockReset().mockResolvedValue({});
    unlink.mockReset().mockResolvedValue(undefined);
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      mapAsset: { delete: mapDelete, findFirst: vi.fn().mockResolvedValue(null) },
      contentAttachment: { deleteMany: attachmentDeleteMany, findFirst: vi.fn().mockResolvedValue(null) },
      media: { delete: mediaDelete },
      siteHome: { findFirst: vi.fn().mockResolvedValue(null) },
      vendor: { findFirst: vi.fn().mockResolvedValue(null) },
      featureEntry: { findFirst: vi.fn().mockResolvedValue(null) },
    }));
  });

  it('deletes the map and its unreferenced media files', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/site-a/admin/maps/5', { method: 'DELETE' }),
      params,
    );

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'delete');
    expect(attachmentDeleteMany).toHaveBeenCalledWith({
      where: { siteId: 7, ownerType: 'map', ownerId: 5 },
    });
    expect(mapDelete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(mediaDelete).toHaveBeenCalledTimes(2);
    expect(unlink).toHaveBeenCalledTimes(2);
  });
});
