import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, findFirst, transaction, externalDeleteMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(), findFirst: vi.fn(), transaction: vi.fn(), externalDeleteMany: vi.fn(),
}));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({ prisma: { vendor: { findFirst }, contentAttachment: { findMany: vi.fn() }, media: { findMany: vi.fn(), findFirst: vi.fn() }, $transaction: transaction } }));
import { PATCH, DELETE } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '3' }) };
const existing = { id: 3, siteId: 7, name: '廠商', category: '工程', status: 'published', publishedAt: new Date() };
function request(method: string, body?: unknown) {
  return new Request('http://localhost/api/site-a/admin/vendors/3', { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
}

describe('vendor item external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findFirst.mockReset().mockResolvedValue(existing);
    externalDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      vendor: { update: vi.fn().mockResolvedValue(existing), delete: vi.fn() },
      contentAttachment: { deleteMany: vi.fn(), createMany: vi.fn() },
      contentExternalLink: { deleteMany: externalDeleteMany, createMany: vi.fn() },
    }));
  });

  it('clears links when updated with an empty list', async () => {
    const response = await PATCH(request('PATCH', { driveUrls: [] }), context);
    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({ where: { siteId: 7, ownerType: 'vendor', ownerId: 3 } });
  });

  it('cleans links when deleted', async () => {
    const response = await DELETE(request('DELETE'), context);
    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({ where: { siteId: 7, ownerType: 'vendor', ownerId: 3 } });
  });
});
