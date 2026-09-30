import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, canManageSiteSettings, siteUpdate, clearSiteCache } = vi.hoisted(() => {
  const requireContentPermission = vi.fn();
  const canManageSiteSettings = vi.fn();
  const siteUpdate = vi.fn();
  const clearSiteCache = vi.fn();
  return { requireContentPermission, canManageSiteSettings, siteUpdate, clearSiteCache };
});

vi.mock('@/lib/contentAccess', () => ({
  requireContentPermission,
  requireSiteContext: vi.fn(),
  canManageSiteSettings,
}));
vi.mock('@/lib/prisma', () => ({ prisma: { site: { update: siteUpdate } } }));
vi.mock('@/lib/site', () => ({ clearSiteCache }));

import { PUT } from './route';

const routeContext = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function putRequest(body: unknown) {
  return new Request('http://localhost/api/site-a/admin/appearance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('site appearance update', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'admin' });
    canManageSiteSettings.mockReset().mockImplementation((role: string) => role === 'admin');
    siteUpdate.mockReset().mockResolvedValue({ id: 7 });
    clearSiteCache.mockReset();
  });

  it('rejects editors from changing site colors', async () => {
    requireContentPermission.mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });

    const response = await PUT(putRequest({ primaryColor: '#2563eb', accentColor: '#1d4ed8' }), routeContext);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: '只有站點管理員可修改外觀設定' });
    expect(siteUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid color codes', async () => {
    const response = await PUT(putRequest({ primaryColor: 'red', accentColor: '#1d4ed8' }), routeContext);

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toContain('色碼');
    expect(siteUpdate).not.toHaveBeenCalled();
  });

  it('updates colors, normalizes hex, and clears the site cache', async () => {
    const response = await PUT(
      putRequest({ primaryColor: '#ABCDEF', accentColor: '#047857' }),
      routeContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: '已更新' });
    expect(siteUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { primaryColor: '#abcdef', accentColor: '#047857' },
    });
    expect(clearSiteCache).toHaveBeenCalledWith('site-a');
  });
});
