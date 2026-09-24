import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, isFeatureEnabled, findFirst, update, deletePost } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  isFeatureEnabled: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/site', () => ({ isFeatureEnabled }));
vi.mock('@/lib/prisma', () => ({ prisma: { post: { findFirst, update, delete: deletePost } } }));

import { DELETE, PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '12' }) };
const post = { id: 12, siteId: 7, title: '舊標題', slug: 'old-title', content: '舊內文', published: false };

function patch(body: unknown) {
  return PATCH(new Request('http://localhost/api/site-a/admin/posts/12', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('legacy post item API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    isFeatureEnabled.mockReset().mockResolvedValue(true);
    findFirst.mockReset().mockResolvedValue(post);
    update.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...post, ...data }));
    deletePost.mockReset().mockResolvedValue(post);
  });

  it('patches a site-scoped post and preserves the published flag', async () => {
    findFirst.mockResolvedValueOnce(post).mockResolvedValueOnce(null);

    const response = await patch({ title: '新標題', slug: 'new_title', content: '新內文', published: true });

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 12, siteId: 7 } });
    expect(update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { title: '新標題', slug: 'new_title', content: '新內文', published: true },
    });
  });

  it('rejects a duplicate slug and non-boolean published values', async () => {
    findFirst.mockResolvedValueOnce(post).mockResolvedValueOnce({ id: 13 });
    expect((await patch({ slug: 'taken' })).status).toBe(409);

    findFirst.mockReset().mockResolvedValue(post);
    expect((await patch({ published: 'yes' })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes only the post in the current site', async () => {
    const response = await DELETE(new Request('http://localhost/api/site-a/admin/posts/12', { method: 'DELETE' }), context);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 12, siteId: 7 } });
    expect(deletePost).toHaveBeenCalledWith({ where: { id: 12 } });
  });
});
