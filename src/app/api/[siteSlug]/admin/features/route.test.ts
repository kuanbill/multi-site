import { beforeEach, describe, expect, it, vi } from 'vitest';

const { siteUpdate, featureDefinitionFindMany, siteFeatureFindMany, siteFeatureUpsert, requireContentPermission, canManageFeatureSettings, clearSiteCache } = vi.hoisted(() => ({
  siteUpdate: vi.fn(),
  featureDefinitionFindMany: vi.fn(),
  siteFeatureFindMany: vi.fn(),
  siteFeatureUpsert: vi.fn(),
  requireContentPermission: vi.fn(),
  canManageFeatureSettings: vi.fn(),
  clearSiteCache: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    site: { update: siteUpdate },
    featureDefinition: { findMany: featureDefinitionFindMany },
    siteFeature: { findMany: siteFeatureFindMany, upsert: siteFeatureUpsert },
  },
}));

vi.mock('@/lib/contentAccess', () => ({
  canManageFeatureSettings,
  requireContentPermission,
  requireSiteContext: vi.fn(),
}));

vi.mock('@/lib/site', () => ({ clearSiteCache }));

import { PUT } from './route';

describe('site homepage visibility setting', () => {
  beforeEach(() => {
    siteUpdate.mockReset().mockResolvedValue({ id: 7, homeVisibility: 'members' });
    featureDefinitionFindMany.mockReset().mockResolvedValue([]);
    siteFeatureFindMany.mockReset().mockResolvedValue([]);
    siteFeatureUpsert.mockReset();
    clearSiteCache.mockReset();
    canManageFeatureSettings.mockReset().mockReturnValue(true);
    requireContentPermission.mockReset().mockResolvedValue({
      site: { id: 7, homeVisibility: 'public' },
      siteRole: 'admin',
    });
  });

  it('saves homepage visibility independently of the always-enabled feature list', async () => {
    const response = await PUT(
      new Request('http://localhost/api/site-a/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: [], homeVisibility: 'members' }),
      }),
      { params: Promise.resolve({ siteSlug: 'site-a' }) },
    );

    expect(response.status).toBe(200);
    expect(siteUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { homeVisibility: 'members' },
    });
    expect(clearSiteCache).toHaveBeenCalledWith('site-a');
  });

  it('rejects an invalid homepage visibility value', async () => {
    const response = await PUT(
      new Request('http://localhost/api/site-a/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: [], homeVisibility: 'private' }),
      }),
      { params: Promise.resolve({ siteSlug: 'site-a' }) },
    );

    expect(response.status).toBe(400);
    expect(siteUpdate).not.toHaveBeenCalled();
  });
});
