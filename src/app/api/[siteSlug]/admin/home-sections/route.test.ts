import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, sectionFindMany, sectionCount, sectionCreate, siteFeatureFindFirst } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  sectionFindMany: vi.fn(),
  sectionCount: vi.fn(),
  sectionCreate: vi.fn(),
  siteFeatureFindFirst: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteHomeSection: { findMany: sectionFindMany, count: sectionCount, create: sectionCreate },
    siteFeature: { findFirst: siteFeatureFindFirst },
  },
}));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };
const siteContext = { site: { id: 7, slug: 'site-a' } };

function requestWith(body: unknown) {
  return new Request('http://localhost/api/site-a/admin/home-sections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('home section collection API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue(siteContext);
    sectionFindMany.mockReset().mockResolvedValue([]);
    sectionCount.mockReset().mockResolvedValue(0);
    sectionCreate.mockReset().mockResolvedValue({ id: 1, sortOrder: 0 });
    siteFeatureFindFirst.mockReset().mockResolvedValue({ id: 2, enabled: true, featureId: 3 });
  });

  it('lets a reader list sections', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/home-sections'), context);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'read');
    await expect(response.json()).resolves.toEqual([]);
  });

  it('creates an announcement section', async () => {
    const response = await POST(requestWith({ sourceType: 'announcement', limit: 5, title: '最新公告' }), context);

    expect(response.status).toBe(201);
    expect(sectionCreate).toHaveBeenCalledWith({
      data: {
        siteId: 7,
        sourceType: 'announcement',
        featureId: null,
        filter: 'all',
        title: '最新公告',
        limit: 5,
        showAll: true,
        sortOrder: 0,
      },
    });
  });

  it('appends new sections after the existing ones', async () => {
    sectionCount.mockResolvedValue(2);

    const response = await POST(requestWith({ sourceType: 'page' }), context);

    expect(response.status).toBe(201);
    expect(sectionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sortOrder: 2 }) }));
  });

  it('does not create anything when the write permission check denies access', async () => {
    requireContentPermission.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(POST(requestWith({ sourceType: 'page' }), context)).rejects.toThrow('NEXT_REDIRECT');
    expect(sectionCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown source type', async () => {
    const response = await POST(requestWith({ sourceType: 'gallery' }), context);

    expect(response.status).toBe(400);
    expect(sectionCreate).not.toHaveBeenCalled();
  });

  it('rejects a feature section whose feature is not enabled on this site', async () => {
    siteFeatureFindFirst.mockResolvedValue(null);

    const response = await POST(requestWith({ sourceType: 'feature', featureId: 3 }), context);

    expect(response.status).toBe(400);
    expect(sectionCreate).not.toHaveBeenCalled();
  });

  it('accepts a feature section whose feature belongs to this site', async () => {
    const response = await POST(requestWith({ sourceType: 'feature', featureId: 3 }), context);

    expect(response.status).toBe(201);
    expect(sectionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sourceType: 'feature', featureId: 3 }) }),
    );
  });

  it('looks the feature up scoped to this site and enabled', async () => {
    await POST(requestWith({ sourceType: 'feature', featureId: 3 }), context);

    expect(siteFeatureFindFirst).toHaveBeenCalledWith({
      where: { siteId: 7, featureId: 3, enabled: true },
    });
  });

  it('rejects more than the allowed number of sections', async () => {
    sectionCount.mockResolvedValue(6);

    const response = await POST(requestWith({ sourceType: 'page' }), context);

    expect(response.status).toBe(400);
    expect(sectionCreate).not.toHaveBeenCalled();
  });
});