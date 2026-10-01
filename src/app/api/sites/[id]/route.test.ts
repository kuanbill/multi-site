import { beforeEach, describe, expect, it, vi } from 'vitest';

const { siteFindUnique, siteFindFirst, siteUpdate, siteDelete, clearSiteCache } = vi.hoisted(() => {
  const siteFindUnique = vi.fn();
  const siteFindFirst = vi.fn();
  const siteUpdate = vi.fn();
  const siteDelete = vi.fn();
  const clearSiteCache = vi.fn();
  return { siteFindUnique, siteFindFirst, siteUpdate, siteDelete, clearSiteCache };
});

vi.mock('@/lib/prisma', () => ({
  prisma: { site: { findUnique: siteFindUnique, findFirst: siteFindFirst, update: siteUpdate, delete: siteDelete } },
}));
vi.mock('@/lib/site', () => ({ clearSiteCache }));

import { DELETE, PUT } from './route';

const routeContext = { params: Promise.resolve({ id: '7' }) };

function putRequest(body: unknown) {
  return new Request('http://localhost/api/sites/7', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('site update/delete cache invalidation', () => {
  beforeEach(() => {
    siteFindUnique.mockReset();
    siteFindFirst.mockReset().mockResolvedValue(null);
    siteUpdate.mockReset();
    siteDelete.mockReset();
    clearSiteCache.mockReset();
  });

  it('clears the old and new slug after a rename', async () => {
    siteFindUnique.mockResolvedValue({ id: 7, slug: 'old-slug' });
    siteUpdate.mockResolvedValue({ id: 7, slug: 'new-slug' });

    const response = await PUT(putRequest({ name: '站點', slug: 'new-slug' }), routeContext);

    expect(response.status).toBe(200);
    expect(clearSiteCache).toHaveBeenCalledWith('old-slug');
    expect(clearSiteCache).toHaveBeenCalledWith('new-slug');
  });

  it('clears the slug once when the slug does not change', async () => {
    siteFindUnique.mockResolvedValue({ id: 7, slug: 'same-slug' });
    siteUpdate.mockResolvedValue({ id: 7, slug: 'same-slug' });

    const response = await PUT(putRequest({ name: '站點', slug: 'same-slug' }), routeContext);

    expect(response.status).toBe(200);
    expect(clearSiteCache).toHaveBeenCalledTimes(1);
    expect(clearSiteCache).toHaveBeenCalledWith('same-slug');
  });

  it('rejects a duplicate slug without clearing the cache', async () => {
    siteFindUnique.mockResolvedValue({ id: 7, slug: 'old-slug' });
    siteFindFirst.mockResolvedValue({ id: 8, slug: 'taken' });

    const response = await PUT(putRequest({ name: '站點', slug: 'taken' }), routeContext);

    expect(response.status).toBe(400);
    expect(siteUpdate).not.toHaveBeenCalled();
    expect(clearSiteCache).not.toHaveBeenCalled();
  });

  it('returns 404 when updating a missing site', async () => {
    siteFindUnique.mockResolvedValue(null);

    const response = await PUT(putRequest({ name: '站點', slug: 'any' }), routeContext);

    expect(response.status).toBe(404);
    expect(siteUpdate).not.toHaveBeenCalled();
    expect(clearSiteCache).not.toHaveBeenCalled();
  });

  it('clears the slug after deleting a site', async () => {
    siteFindUnique.mockResolvedValue({ id: 7, slug: 'doomed' });
    siteDelete.mockResolvedValue({ id: 7 });

    const response = await DELETE(new Request('http://localhost/api/sites/7', { method: 'DELETE' }), routeContext);

    expect(response.status).toBe(200);
    expect(siteDelete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(clearSiteCache).toHaveBeenCalledWith('doomed');
  });
});
