import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, findFirst, findUnique, transaction, externalDeleteMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  externalDeleteMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exhibition: { findFirst, findUnique },
    contentAttachment: { findMany: vi.fn() },
    $transaction: transaction,
  },
}));

import { DELETE, PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '5' }) };
const existing = {
  id: 5,
  siteId: 7,
  title: '展覽',
  slug: 'expo',
  startDate: null,
  endDate: null,
  status: 'published',
  publishedAt: new Date('2026-10-20T00:00:00.000Z'),
};

function request(method: string, body?: unknown) {
  return new Request('http://localhost/api/site-a/admin/exhibition/5', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('exhibition item API external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findFirst.mockReset().mockResolvedValue(existing);
    findUnique.mockReset().mockResolvedValue(null);
    externalDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      exhibition: { update: vi.fn().mockResolvedValue(existing), delete: vi.fn() },
      contentAttachment: { deleteMany: vi.fn(), createMany: vi.fn() },
      contentExternalLink: { deleteMany: externalDeleteMany, createMany: vi.fn() },
    }));
  });

  it('clears Google Drive links when an empty list is submitted', async () => {
    const response = await PATCH(request('PATCH', { driveUrls: [] }), context);

    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({
      where: { siteId: 7, ownerType: 'exhibition', ownerId: 5 },
    });
  });

  it('cleans Google Drive links when an exhibition is deleted', async () => {
    const response = await DELETE(request('DELETE'), context);

    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({
      where: { siteId: 7, ownerType: 'exhibition', ownerId: 5 },
    });
  });
});
