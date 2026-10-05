import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, findFirst, update } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({ prisma: { announcement: { findFirst, update } } }));

import { PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '12' }) };
const existing = {
  id: 12,
  siteId: 7,
  title: '舊標題',
  slug: 'announcement-abc123def456',
  summary: null,
  content: '舊內文',
  category: null,
  pinned: false,
  status: 'draft',
  sortOrder: 0,
  publishedAt: null,
};

function patch(body: unknown) {
  return PATCH(new Request('http://localhost/api/site-a/admin/announcement/12', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('announcement item API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findFirst.mockReset().mockResolvedValue(existing);
    update.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...existing, ...data }));
  });

  it('keeps the original slug even when the client sends one', async () => {
    const response = await patch({ title: '新標題', slug: 'hacked-slug' });

    expect(response.status).toBe(200);
    const data = update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty('slug');
    expect(data.title).toBe('新標題');
    const body = await response.json();
    expect(body.slug).toBe('announcement-abc123def456');
  });

  it('updates only site-scoped announcements', async () => {
    findFirst.mockResolvedValue(null);

    const response = await patch({ title: '新標題' });

    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 12, siteId: 7 } });
    expect(update).not.toHaveBeenCalled();
  });
});
