import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, findUnique, findMany, create } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({ prisma: { announcement: { findUnique, findMany, create } } }));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function post(body: unknown) {
  return POST(new Request('http://localhost/api/site-a/admin/announcement', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('announcement collection API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findMany.mockReset().mockResolvedValue([]);
    findUnique.mockReset().mockResolvedValue(null);
    create.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }));
  });

  it('reads announcements only from the current site', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/announcement'), context);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'read');
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 7 },
      orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  });

  it('auto-generates the slug when the client does not send one', async () => {
    const response = await post({ title: '公告標題', content: '內文', status: 'published' });

    expect(response.status).toBe(201);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    const created = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(created.slug).toMatch(/^announcement-[a-f0-9]{12}$/);
    expect(created).toMatchObject({ siteId: 7, title: '公告標題', status: 'published' });
  });

  it('ignores a client-provided slug', async () => {
    const response = await post({ title: '公告標題', slug: 'custom-slug', content: '內文' });

    expect(response.status).toBe(201);
    const created = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(created.slug).not.toBe('custom-slug');
    expect(created.slug).toMatch(/^announcement-[a-f0-9]{12}$/);
  });

  it('retries with a new slug when the candidate already exists', async () => {
    findUnique.mockResolvedValueOnce({ id: 9 }).mockResolvedValueOnce(null);

    const response = await post({ title: '公告標題', content: '內文' });

    expect(response.status).toBe(201);
    expect(findUnique).toHaveBeenCalledTimes(2);
    const created = create.mock.calls[0][0].data as Record<string, unknown>;
    expect(created.slug).toMatch(/^announcement-[a-f0-9]{12}$/);
  });

  it('rejects an announcement without a title', async () => {
    const response = await post({ content: '內文' });

    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
