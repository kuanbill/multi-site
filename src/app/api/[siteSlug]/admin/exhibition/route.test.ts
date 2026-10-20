import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireContentPermission,
  findUnique,
  findMany,
  mediaFindMany,
  transaction,
  exhibitionCreate,
  externalCreateMany,
} = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  mediaFindMany: vi.fn(),
  transaction: vi.fn(),
  exhibitionCreate: vi.fn(),
  externalCreateMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exhibition: { findUnique, findMany },
    media: { findMany: mediaFindMany },
    $transaction: transaction,
  },
}));

import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function post(body: unknown) {
  return POST(new Request('http://localhost/api/site-a/admin/exhibition', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('exhibition collection API external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findUnique.mockReset().mockResolvedValue(null);
    findMany.mockReset().mockResolvedValue([]);
    mediaFindMany.mockReset().mockResolvedValue([]);
    exhibitionCreate.mockReset().mockResolvedValue({ id: 5, siteId: 7, slug: 'expo' });
    externalCreateMany.mockReset().mockResolvedValue({ count: 2 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      exhibition: { create: exhibitionCreate },
      contentAttachment: { createMany: vi.fn() },
      contentExternalLink: { deleteMany: vi.fn(), createMany: externalCreateMany },
    }));
  });

  it('persists multiple Google Drive links in order', async () => {
    const urls = ['https://drive.google.com/file/d/one/view', 'https://drive.google.com/file/d/two/view'];
    const response = await post({ title: '展覽', slug: 'expo', driveUrls: urls });

    expect(response.status).toBe(201);
    expect(externalCreateMany).toHaveBeenCalledWith({
      data: urls.map((url, sortOrder) => ({ siteId: 7, ownerType: 'exhibition', ownerId: 5, url, sortOrder })),
    });
  });

  it('rejects invalid Google Drive links', async () => {
    const response = await post({ title: '展覽', slug: 'expo', driveUrls: ['http://drive.google.com/file'] });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
