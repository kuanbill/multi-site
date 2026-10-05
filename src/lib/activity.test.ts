import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSiteBySlug, featureDefinitionFindFirst, featureViewCreate } = vi.hoisted(() => ({
  getSiteBySlug: vi.fn(),
  featureDefinitionFindFirst: vi.fn(),
  featureViewCreate: vi.fn(),
}));

vi.mock('./site', () => ({ getSiteBySlug }));
vi.mock('./prisma', () => ({
  prisma: { featureDefinition: { findFirst: featureDefinitionFindFirst }, featureView: { create: featureViewCreate } },
}));

import { resolveFrontendView, trackFrontendView } from './activity';

describe('resolveFrontendView', () => {
  it('resolves a feature list page', () => {
    expect(resolveFrontendView('/zhonghe-renewal/announcement')).toEqual({
      siteSlug: 'zhonghe-renewal',
      featurePath: 'announcement',
      path: '/zhonghe-renewal/announcement',
    });
  });

  it('resolves a feature detail page', () => {
    expect(resolveFrontendView('/zhonghe-renewal/vendors/12')).toMatchObject({
      siteSlug: 'zhonghe-renewal',
      featurePath: 'vendors',
    });
  });

  it('ignores the site home page', () => {
    expect(resolveFrontendView('/zhonghe-renewal')).toBeNull();
  });

  it('ignores reserved top-level routes', () => {
    expect(resolveFrontendView('/admin/features')).toBeNull();
    expect(resolveFrontendView('/users/new')).toBeNull();
    expect(resolveFrontendView('/sites/1/edit')).toBeNull();
  });

  it('ignores the site admin area and site login', () => {
    expect(resolveFrontendView('/zhonghe-renewal/admin/media')).toBeNull();
    expect(resolveFrontendView('/zhonghe-renewal/login')).toBeNull();
  });
});

describe('trackFrontendView', () => {
  beforeEach(() => {
    getSiteBySlug.mockReset().mockResolvedValue({ id: 7, slug: 'site-a', status: 'active' });
    featureDefinitionFindFirst.mockReset().mockResolvedValue({ key: 'announcements' });
    featureViewCreate.mockReset().mockResolvedValue({ id: 1 });
  });

  const target = { siteSlug: 'site-a', featurePath: 'announcement', path: '/site-a/announcement' };

  it('records the view with the resolved feature key and user', async () => {
    await trackFrontendView(target, 12);

    expect(featureViewCreate).toHaveBeenCalledWith({
      data: { siteId: 7, feature: 'announcements', path: '/site-a/announcement', userId: 12 },
    });
  });

  it('records anonymous views with a null user', async () => {
    await trackFrontendView(target, null);

    expect(featureViewCreate).toHaveBeenCalledWith({
      data: { siteId: 7, feature: 'announcements', path: '/site-a/announcement', userId: null },
    });
  });

  it('skips paths that are not registered features', async () => {
    featureDefinitionFindFirst.mockResolvedValue(null);

    await trackFrontendView({ siteSlug: 'site-a', featurePath: 'pages', path: '/site-a/pages' }, null);

    expect(featureViewCreate).not.toHaveBeenCalled();
  });

  it('skips unknown or archived sites', async () => {
    getSiteBySlug.mockResolvedValue(null);
    await trackFrontendView(target, null);
    getSiteBySlug.mockResolvedValue({ id: 7, slug: 'site-a', status: 'archived' });
    await trackFrontendView(target, null);

    expect(featureViewCreate).not.toHaveBeenCalled();
  });

  it('never throws when persistence fails', async () => {
    featureViewCreate.mockRejectedValue(new Error('db down'));

    await expect(trackFrontendView(target, 1)).resolves.toBeUndefined();
  });
});
