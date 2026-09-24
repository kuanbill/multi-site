import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminSession, findUnique, findFirst, featureUpdate, siteFeatureDeleteMany, featureDelete, pageDeleteMany, postDeleteMany, transaction } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  featureUpdate: vi.fn(),
  siteFeatureDeleteMany: vi.fn(),
  featureDelete: vi.fn(),
  pageDeleteMany: vi.fn(),
  postDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    featureDefinition: { findUnique, findFirst, update: featureUpdate, delete: featureDelete },
    siteFeature: { deleteMany: siteFeatureDeleteMany },
    page: { deleteMany: pageDeleteMany },
    post: { deleteMany: postDeleteMany },
    $transaction: transaction,
  },
}));

import { DELETE, PUT } from './route';

describe('global feature deletion', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue({ user: { role: 'admin' } });
    findUnique.mockReset().mockResolvedValue({ id: 3, key: 'faq-center', isSystem: true });
    findFirst.mockReset().mockResolvedValue(null);
    featureUpdate.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 3, ...data }));
    siteFeatureDeleteMany.mockReset().mockResolvedValue({ count: 2 });
    featureDelete.mockReset().mockResolvedValue({ id: 3 });
    pageDeleteMany.mockReset().mockResolvedValue({ count: 2 });
    postDeleteMany.mockReset().mockResolvedValue({ count: 3 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      siteFeature: { deleteMany: siteFeatureDeleteMany },
      featureDefinition: { delete: featureDelete },
      page: { deleteMany: pageDeleteMany },
      post: { deleteMany: postDeleteMany },
    }));
  });

  it('atomically deletes all site settings and the feature definition, including system features', async () => {
    const response = await DELETE(new Request('http://localhost/api/admin/features/3', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(siteFeatureDeleteMany).toHaveBeenCalledWith({ where: { featureId: 3 } });
    expect(featureDelete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('rejects deleting a missing feature', async () => {
    findUnique.mockResolvedValue(null);

    const response = await DELETE(new Request('http://localhost/api/admin/features/3', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('keeps a custom feature key equal to its updated path', async () => {
    findUnique.mockResolvedValue({ id: 3, key: 'old-key', label: 'FAQ', icon: null, path: 'old-path', isSystem: false, description: null, displayMode: 'list' });
    const response = await PUT(new Request('http://localhost/api/admin/features/3', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'FAQ', path: 'new-path' }),
    }), { params: Promise.resolve({ id: '3' }) });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: { not: 3 }, OR: [{ key: 'new-path' }, { path: 'new-path' }] },
      select: { id: true },
    });
    expect(featureUpdate).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({ key: 'new-path', path: 'new-path' }),
    });
  });

  it('rejects duplicate and reserved custom paths on edit', async () => {
    findUnique.mockResolvedValue({ id: 3, key: 'old-key', label: 'FAQ', icon: null, path: 'old-path', isSystem: false, description: null, displayMode: 'list' });
    findFirst.mockResolvedValueOnce({ id: 4 });
    const duplicate = await PUT(new Request('http://localhost/api/admin/features/3', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'FAQ', path: 'new-path' }),
    }), { params: Promise.resolve({ id: '3' }) });

    expect(duplicate.status).toBe(409);
    expect(featureUpdate).not.toHaveBeenCalled();

    findFirst.mockReset();
    const reserved = await PUT(new Request('http://localhost/api/admin/features/3', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'FAQ', path: 'announcement' }),
    }), { params: Promise.resolve({ id: '3' }) });
    expect(reserved.status).toBe(409);
    expect(featureUpdate).not.toHaveBeenCalled();
  });

  it('keeps legacy pages/posts route paths fixed', async () => {
    findUnique.mockResolvedValue({ id: 3, key: 'pages', label: '頁面', icon: null, path: 'pages', isSystem: false, description: null, displayMode: 'list' });

    const response = await PUT(new Request('http://localhost/api/admin/features/3', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: '一般頁面', path: 'pages-content' }),
    }), { params: Promise.resolve({ id: '3' }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'pages/posts 功能路徑固定不可修改' });
    expect(featureUpdate).not.toHaveBeenCalled();
  });

  it('deletes legacy Page/Post data from every site with its global feature', async () => {
    findUnique.mockResolvedValue({ id: 3, key: 'pages', isSystem: false });

    const response = await DELETE(new Request('http://localhost/api/admin/features/3', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(200);
    expect(pageDeleteMany).toHaveBeenCalledWith({ where: {} });
    expect(postDeleteMany).not.toHaveBeenCalled();
  });

  it('deletes legacy Post data when deleting the posts feature', async () => {
    findUnique.mockResolvedValue({ id: 3, key: 'posts', isSystem: false });

    const response = await DELETE(new Request('http://localhost/api/admin/features/3', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(200);
    expect(postDeleteMany).toHaveBeenCalledWith({ where: {} });
    expect(pageDeleteMany).not.toHaveBeenCalled();
  });
});
