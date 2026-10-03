import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, sectionFindMany, sectionCreateMany, sectionCount } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  sectionFindMany: vi.fn(),
  sectionCreateMany: vi.fn(),
  sectionCount: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteHomeSection: {
      findMany: sectionFindMany,
      createMany: sectionCreateMany,
      count: sectionCount,
    },
  },
}));

import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };
const siteContext = { site: { id: 7, slug: 'site-a' } };

describe('default home sections API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue(siteContext);
    sectionFindMany.mockReset().mockResolvedValue([]);
    sectionCreateMany.mockReset().mockImplementation(async ({ data }) => ({ count: data.length }));
    sectionCount.mockReset().mockResolvedValue(0);
  });

  it('adds the announcement, progress and page sections', async () => {
    const response = await POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context);

    expect(response.status).toBe(201);
    expect(sectionCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ siteId: 7, sourceType: 'announcement', filter: 'all', title: '最新公告', limit: 3 }),
        expect.objectContaining({ siteId: 7, sourceType: 'progress', filter: 'current', title: '目前進度', limit: 1 }),
        expect.objectContaining({ siteId: 7, sourceType: 'page', filter: 'all', title: '頁面' }),
      ],
    });
  });

  it('appends defaults after any sections that already exist', async () => {
    sectionCount.mockResolvedValue(2);

    await POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context);

    expect(sectionCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ sortOrder: 2 }),
        expect.objectContaining({ sortOrder: 3 }),
        expect.objectContaining({ sortOrder: 4 }),
      ],
    });
  });

  it('creates nothing when every default already exists', async () => {
    sectionFindMany.mockResolvedValue([
      { id: 1, sourceType: 'announcement' },
      { id: 2, sourceType: 'progress' },
      { id: 3, sourceType: 'page' },
    ]);

    const response = await POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context);

    expect(response.status).toBe(200);
    expect(sectionCreateMany).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ added: 0 });
  });

  it('adds only the missing defaults', async () => {
    sectionFindMany.mockResolvedValue([{ id: 1, sourceType: 'announcement' }]);

    const response = await POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context);

    expect(response.status).toBe(201);
    expect(sectionCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ sourceType: 'progress' }),
        expect.objectContaining({ sourceType: 'page' }),
      ],
    });
    await expect(response.json()).resolves.toEqual({ added: 2 });
  });

  it('refuses to add defaults that would exceed the section limit', async () => {
    sectionCount.mockResolvedValue(5);

    const response = await POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context);

    expect(response.status).toBe(400);
    expect(sectionCreateMany).not.toHaveBeenCalled();
  });

  it('requires write permission', async () => {
    requireContentPermission.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(POST(new Request('http://localhost/api/site-a/admin/home-sections/defaults'), context)).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(sectionCreateMany).not.toHaveBeenCalled();
  });
});