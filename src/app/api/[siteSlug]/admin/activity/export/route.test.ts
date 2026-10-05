import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSiteContext, loginRecordFindMany, featureViewFindMany, featureDefinitionFindMany } = vi.hoisted(() => ({
  requireSiteContext: vi.fn(),
  loginRecordFindMany: vi.fn(),
  featureViewFindMany: vi.fn(),
  featureDefinitionFindMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/contentAccess')>();
  return { ...actual, requireSiteContext };
});
vi.mock('@/lib/prisma', () => ({
  prisma: {
    loginRecord: { findMany: loginRecordFindMany },
    featureView: { findMany: featureViewFindMany },
    featureDefinition: { findMany: featureDefinitionFindMany },
  },
}));

import { GET } from './route';

describe('log export route', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue({ site: { id: 7 }, session: {}, siteRole: 'editor' });
    loginRecordFindMany.mockReset().mockResolvedValue([
      { user: { name: '管理員', email: 'admin@example.com' }, createdAt: new Date(2026, 9, 5, 9, 0, 0) },
    ]);
    featureViewFindMany.mockReset().mockResolvedValue([
      { path: '/site-a/announcement', feature: 'announcements', createdAt: new Date(2026, 9, 5, 10, 0, 0), user: { name: '編輯者' } },
    ]);
    featureDefinitionFindMany.mockReset().mockResolvedValue([{ key: 'announcements', label: '公告欄' }]);
  });

  const request = (query: string) => new Request(`https://example.test/api/site-a/admin/activity/export${query}`);

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue({ site: { id: 7 }, session: {}, siteRole: 'viewer' });

    const response = await GET(request('?type=logins'), { params: Promise.resolve({ siteSlug: 'site-a' }) });

    expect(response.status).toBe(403);
    expect(loginRecordFindMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown log type', async () => {
    const response = await GET(request('?type=everything'), { params: Promise.resolve({ siteSlug: 'site-a' }) });

    expect(response.status).toBe(400);
  });

  it('exports login records as a downloadable BOM CSV', async () => {
    const response = await GET(request('?type=logins'), { params: Promise.resolve({ siteSlug: 'site-a' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="logins-site-a.csv"');
    const bytes = Buffer.from(await response.arrayBuffer());
    // 前三個位元組必須是 UTF-8 BOM；fetch 的 text() 會解碼時吃掉它，所以直接驗位元組。
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const body = bytes.toString('utf8');
    expect(body).toContain('"2026-10-05 09:00:00","管理員","admin@example.com"');
  });

  it('exports this site only and translates feature keys to labels', async () => {
    const response = await GET(request('?type=views'), { params: Promise.resolve({ siteSlug: 'site-a' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="views-site-a.csv"');
    expect(featureViewFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: 7 } }));
    const body = await response.text();
    expect(body).toContain('"2026-10-05 10:00:00","編輯者","公告欄","/site-a/announcement"');
  });

  it('marks the export as uncacheable', async () => {
    const response = await GET(request('?type=logins'), { params: Promise.resolve({ siteSlug: 'site-a' }) });

    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
