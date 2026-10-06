import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSiteContext } = vi.hoisted(() => ({ requireSiteContext: vi.fn() }));

vi.mock('@/lib/contentAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contentAccess')>()),
  requireSiteContext,
}));

import { GET } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function siteContextOf(siteRole: string) {
  return {
    site: { id: 7, slug: 'site-a' },
    session: { user: { id: '1', role: 'editor', siteRoles: [{ slug: 'site-a', role: siteRole }] } },
    siteRole,
  };
}

describe('member import template API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('editor'));
  });

  it('returns an xlsx template download', async () => {
    const response = await GET(new Request('http://localhost/api/site-a/admin/users/import/template'), context);
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('spreadsheetml.sheet');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await GET(new Request('http://localhost/api/site-a/admin/users/import/template'), context);

    expect(response.status).toBe(403);
  });
});
