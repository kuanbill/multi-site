import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, transaction, vendorCreate, externalCreateMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(), transaction: vi.fn(), vendorCreate: vi.fn(), externalCreateMany: vi.fn(),
}));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({ prisma: { media: { findMany: vi.fn(), findFirst: vi.fn() }, $transaction: transaction } }));
import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };
function post(body: unknown) {
  return POST(new Request('http://localhost/api/site-a/admin/vendors', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), context);
}

describe('vendor collection external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    vendorCreate.mockReset().mockResolvedValue({ id: 3, siteId: 7 });
    externalCreateMany.mockReset().mockResolvedValue({ count: 2 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      vendor: { create: vendorCreate }, contentAttachment: { createMany: vi.fn() },
      contentExternalLink: { deleteMany: vi.fn(), createMany: externalCreateMany },
    }));
  });

  it('persists multiple Google Drive links in order', async () => {
    const urls = ['https://drive.google.com/file/d/one/view', 'https://drive.google.com/file/d/two/view'];
    const response = await post({ name: '廠商', category: '工程', driveUrls: urls });
    expect(response.status).toBe(201);
    expect(externalCreateMany).toHaveBeenCalledWith({ data: urls.map((url, sortOrder) => ({ siteId: 7, ownerType: 'vendor', ownerId: 3, url, sortOrder })) });
  });

  it('rejects invalid Google Drive links', async () => {
    const response = await post({ name: '廠商', category: '工程', driveUrls: ['http://drive.google.com/file'] });
    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
