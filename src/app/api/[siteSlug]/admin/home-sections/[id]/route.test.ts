import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, sectionFindFirst, sectionUpdate, sectionDelete, siteFeatureFindFirst } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  sectionFindFirst: vi.fn(),
  sectionUpdate: vi.fn(),
  sectionDelete: vi.fn(),
  siteFeatureFindFirst: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteHomeSection: { findFirst: sectionFindFirst, update: sectionUpdate, delete: sectionDelete },
    siteFeature: { findFirst: siteFeatureFindFirst },
  },
}));

import { DELETE, PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '5' }) };
const siteContext = { site: { id: 7, slug: 'site-a' } };
const existingSection = {
  id: 5,
  siteId: 7,
  sourceType: 'announcement',
  featureId: null,
  filter: 'all',
  title: '最新公告',
  limit: 3,
  showAll: true,
  sortOrder: 0,
};

function requestWith(method: string, body: unknown) {
  return new Request('http://localhost/api/site-a/admin/home-sections/5', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('home section item API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue(siteContext);
    sectionFindFirst.mockReset().mockResolvedValue(existingSection);
    sectionUpdate.mockReset().mockResolvedValue({ ...existingSection, limit: 5 });
    sectionDelete.mockReset().mockResolvedValue(existingSection);
    siteFeatureFindFirst.mockReset().mockResolvedValue({ id: 2, enabled: true, featureId: 3 });
  });

  it('updates the title and item limit', async () => {
    const response = await PATCH(requestWith('PATCH', { title: '本週公告', limit: 5 }), context);

    expect(response.status).toBe(200);
    expect(sectionUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: expect.objectContaining({ title: '本週公告', limit: 5 }),
    });
  });

  it('scopes the lookup to this site', async () => {
    await PATCH(requestWith('PATCH', { limit: 4 }), context);

    expect(sectionFindFirst).toHaveBeenCalledWith({ where: { id: 5, siteId: 7 } });
  });

  it('returns 404 for a section belonging to another site', async () => {
    sectionFindFirst.mockResolvedValue(null);

    const response = await PATCH(requestWith('PATCH', { limit: 4 }), context);

    expect(response.status).toBe(404);
    expect(sectionUpdate).not.toHaveBeenCalled();
  });

  it('rejects a feature section whose feature is not enabled on this site', async () => {
    siteFeatureFindFirst.mockResolvedValue(null);

    const response = await PATCH(requestWith('PATCH', { sourceType: 'feature', featureId: 3 }), context);

    expect(response.status).toBe(400);
    expect(sectionUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid limit', async () => {
    const response = await PATCH(requestWith('PATCH', { limit: 99 }), context);

    expect(response.status).toBe(400);
    expect(sectionUpdate).not.toHaveBeenCalled();
  });

  it('deletes a section', async () => {
    const response = await DELETE(new Request('http://localhost/api/site-a/admin/home-sections/5'), context);

    expect(response.status).toBe(200);
    expect(sectionDelete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('does not delete a section from another site', async () => {
    sectionFindFirst.mockResolvedValue(null);

    const response = await DELETE(new Request('http://localhost/api/site-a/admin/home-sections/5'), context);

    expect(response.status).toBe(404);
    expect(sectionDelete).not.toHaveBeenCalled();
  });
});