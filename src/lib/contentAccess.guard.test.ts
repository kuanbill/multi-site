import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSiteBySlug = vi.hoisted(() => vi.fn());
const getSiteFeature = vi.hoisted(() => vi.fn());
const getServerSession = vi.hoisted(() => vi.fn());

vi.mock('./site', () => ({ getSiteBySlug, getSiteFeature }));
vi.mock('./auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { requirePublicFeature } from './contentAccess';

const activeSite = { id: 7, slug: 'site-a', status: 'active' };
const archivedSite = { id: 8, slug: 'site-a', status: 'archived' };
const publicFeature = {
  id: 1,
  siteId: 7,
  featureId: 1,
  enabled: true,
  visibility: 'public',
  feature: { id: 1, key: 'announcements' },
};
const membersFeature = { ...publicFeature, visibility: 'members' };

describe('public feature access', () => {
  beforeEach(() => {
    getSiteBySlug.mockReset();
    getSiteFeature.mockReset();
    getServerSession.mockReset();
    getSiteBySlug.mockResolvedValue(activeSite);
  });

  it('returns a published-only where fragment for public content', async () => {
    getSiteFeature.mockResolvedValue(publicFeature);
    getServerSession.mockResolvedValue(null);

    await expect(requirePublicFeature('site-a', 'announcements')).resolves.toMatchObject({
      publishedWhere: { status: 'published' },
    });
  });

  it('rejects archived sites before checking feature visibility', async () => {
    getSiteBySlug.mockResolvedValue(archivedSite);

    await expect(requirePublicFeature('site-a', 'announcements')).rejects.toThrow('NOT_FOUND');
    expect(getSiteFeature).not.toHaveBeenCalled();
  });

  it('rejects a non-member from a members-only feature', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue({
      user: { role: 'editor', siteRoles: [{ slug: 'site-b', role: 'viewer' }] },
    });

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow('REDIRECT:/403');
  });

  it('allows a member from the requested site into a members-only feature', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue({
      user: { role: 'editor', siteRoles: [{ slug: 'site-a', role: 'viewer' }] },
    });

    await expect(requirePublicFeature('site-a', 'meetings')).resolves.toMatchObject({
      site: { slug: 'site-a' },
    });
  });
});
