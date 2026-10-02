import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSiteBySlug = vi.hoisted(() => vi.fn());
const getSiteFeature = vi.hoisted(() => vi.fn());
const getServerSession = vi.hoisted(() => vi.fn());
const headers = vi.hoisted(() => vi.fn());

vi.mock('./site', () => ({ getSiteBySlug, getSiteFeature }));
vi.mock('./auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('next/headers', () => ({ headers }));
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
  feature: { id: 1, key: 'announcements', path: 'announcement' },
};
const membersFeature = {
  ...publicFeature,
  visibility: 'members',
  feature: { id: 1, key: 'meetings', path: 'meeting' },
};

function mockPathname(value: string | null) {
  headers.mockResolvedValue({
    get: (name: string) => (name === 'x-pathname' ? value : null),
  });
}

describe('public feature access', () => {
  beforeEach(() => {
    getSiteBySlug.mockReset();
    getSiteFeature.mockReset();
    getServerSession.mockReset();
    headers.mockReset();
    getSiteBySlug.mockResolvedValue(activeSite);
    mockPathname('/site-a/meeting');
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

  it('redirects an anonymous visitor to the site login with a callback', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue(null);

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow(
      'REDIRECT:/site-a/login?reason=members-only&callbackUrl=%2Fsite-a%2Fmeeting',
    );
  });

  it('redirects a logged-in non-member to the site login with an error flag', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue({
      user: { role: 'editor', siteRoles: [{ slug: 'site-b', role: 'viewer' }] },
    });

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow(
      'REDIRECT:/site-a/login?error=not-member&callbackUrl=%2Fsite-a%2Fmeeting',
    );
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

  it('allows a global admin into a members-only feature', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue({
      user: { role: 'admin', siteRoles: [] },
    });

    await expect(requirePublicFeature('site-a', 'meetings')).resolves.toMatchObject({
      site: { slug: 'site-a' },
    });
  });

  it('keeps the current path including the query string as callback', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue(null);
    mockPathname('/site-a/meeting?tab=minutes');

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow(
      'REDIRECT:/site-a/login?reason=members-only&callbackUrl=%2Fsite-a%2Fmeeting%3Ftab%3Dminutes',
    );
  });

  it('falls back to the feature path when the pathname header is missing', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue(null);
    mockPathname(null);

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow(
      'REDIRECT:/site-a/login?reason=members-only&callbackUrl=%2Fsite-a%2Fmeeting',
    );
  });

  it('falls back to the feature path when the pathname header is unsafe', async () => {
    getSiteFeature.mockResolvedValue(membersFeature);
    getServerSession.mockResolvedValue(null);
    mockPathname('//evil.com/steal');

    await expect(requirePublicFeature('site-a', 'meetings')).rejects.toThrow(
      'REDIRECT:/site-a/login?reason=members-only&callbackUrl=%2Fsite-a%2Fmeeting',
    );
  });
});
