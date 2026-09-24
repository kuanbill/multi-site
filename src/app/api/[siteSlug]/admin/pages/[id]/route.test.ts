import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, isFeatureEnabled, findFirst, update, deletePage } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  isFeatureEnabled: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  deletePage: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/site', () => ({ isFeatureEnabled }));
vi.mock('@/lib/prisma', () => ({ prisma: { page: { findFirst, update, delete: deletePage } } }));

import { DELETE, PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '12' }) };
const page = { id: 12, siteId: 7, title: '舊標題', slug: 'old-title', content: '舊內文' };

function patch(body: unknown) {
  return PATCH(new Request('http://localhost/api/site-a/admin/pages/12', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('legacy page item API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    isFeatureEnabled.mockReset().mockResolvedValue(true);
    findFirst.mockReset().mockResolvedValue(page);
    update.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...page, ...data }));
    deletePage.mockReset().mockResolvedValue(page);
  });

  it('patches only a page scoped to the current site', async () => {
    findFirst.mockResolvedValueOnce(page).mockResolvedValueOnce(null);
    const response = await patch({ title: '新標題', slug: 'new_title', content: '新內文' });

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 12, siteId: 7 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 12 }, data: { title: '新標題', slug: 'new_title', content: '新內文' } });
  });

  it('rejects a slug already used by another page in the same site', async () => {
    findFirst.mockResolvedValueOnce(page).mockResolvedValueOnce({ id: 13 });

    const response = await patch({ slug: 'taken' });

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes a page only after write access and site-scoped lookup', async () => {
    const response = await DELETE(new Request('http://localhost/api/site-a/admin/pages/12', { method: 'DELETE' }), context);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 12, siteId: 7 } });
    expect(deletePage).toHaveBeenCalledWith({ where: { id: 12 } });
  });
});
