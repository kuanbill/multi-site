import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, isFeatureEnabled, getServerSession, siteFindUnique, findMany, findFirst, create } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getServerSession: vi.fn(),
  siteFindUnique: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/site', () => ({ isFeatureEnabled }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { site: { findUnique: siteFindUnique }, page: { findMany, findFirst, create } } }));

import { GET, POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function post(body: unknown) {
  return POST(new Request('http://localhost/api/site-a/admin/pages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), context);
}

describe('legacy page collection API', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    isFeatureEnabled.mockReset().mockResolvedValue(true);
    getServerSession.mockReset().mockResolvedValue({ user: { role: 'editor', siteRoles: [{ slug: 'site-a', role: 'editor' }] } });
    siteFindUnique.mockReset().mockResolvedValue({ id: 7, slug: 'site-a' });
    findMany.mockReset().mockResolvedValue([]);
    findFirst.mockReset().mockResolvedValue(null);
    create.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 5, ...data }));
  });

  it('reads only pages from the current site', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/pages'), context);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'read');
    expect(findMany).toHaveBeenCalledWith({ where: { siteId: 7 }, orderBy: { createdAt: 'desc' } });
  });

  it('creates a page with the current site id', async () => {
    const response = await post({ title: '專案簡介', slug: 'project_intro', content: '內容' });

    expect(response.status).toBe(201);
    expect(requireContentPermission).toHaveBeenCalledWith('site-a', 'write');
    expect(create).toHaveBeenCalledWith({
      data: { siteId: 7, title: '專案簡介', slug: 'project_intro', content: '內容' },
    });
  });

  it('rejects creating pages while the legacy feature is disabled', async () => {
    isFeatureEnabled.mockResolvedValue(false);

    const response = await post({ title: '專案簡介', slug: 'project_intro', content: '內容' });

    expect(response.status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
