import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSiteContext, loginRecordDeleteMany, featureViewDeleteMany } = vi.hoisted(() => ({
  requireSiteContext: vi.fn(),
  loginRecordDeleteMany: vi.fn(),
  featureViewDeleteMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/contentAccess')>();
  return { ...actual, requireSiteContext };
});
vi.mock('@/lib/prisma', () => ({
  prisma: {
    loginRecord: { deleteMany: loginRecordDeleteMany },
    featureView: { deleteMany: featureViewDeleteMany },
  },
}));

import { DELETE } from './route';

describe('log clear route', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue({ site: { id: 7 }, session: {}, siteRole: 'admin' });
    loginRecordDeleteMany.mockReset().mockResolvedValue({ count: 3 });
    featureViewDeleteMany.mockReset().mockResolvedValue({ count: 5 });
  });

  const request = (query: string) => new Request(`https://example.test/api/site-a/admin/activity${query}`, { method: 'DELETE' });
  const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

  it('rejects an editor because clearing logs cannot be undone', async () => {
    requireSiteContext.mockResolvedValue({ site: { id: 7 }, session: {}, siteRole: 'editor' });

    const response = await DELETE(request('?type=views'), context);

    expect(response.status).toBe(403);
    expect(featureViewDeleteMany).not.toHaveBeenCalled();
  });

  it('allows a global administrator', async () => {
    requireSiteContext.mockResolvedValue({ site: { id: 7 }, session: {}, siteRole: 'global-admin' });

    const response = await DELETE(request('?type=views'), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cleared: 5 });
  });

  it('rejects an unknown log type', async () => {
    const response = await DELETE(request('?type=stats'), context);

    expect(response.status).toBe(400);
  });

  it('clears login records across sites because they are stored per user', async () => {
    const response = await DELETE(request('?type=logins'), context);

    expect(response.status).toBe(200);
    expect(loginRecordDeleteMany).toHaveBeenCalledWith({});
    expect(featureViewDeleteMany).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ cleared: 3 });
  });

  it('clears browse records scoped to this site only', async () => {
    const response = await DELETE(request('?type=views'), context);

    expect(response.status).toBe(200);
    expect(featureViewDeleteMany).toHaveBeenCalledWith({ where: { siteId: 7 } });
    expect(loginRecordDeleteMany).not.toHaveBeenCalled();
  });
});
