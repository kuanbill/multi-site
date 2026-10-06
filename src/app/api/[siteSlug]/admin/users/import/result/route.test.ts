import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSiteContext } = vi.hoisted(() => ({ requireSiteContext: vi.fn() }));

vi.mock('@/lib/contentAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contentAccess')>()),
  requireSiteContext,
}));

import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function siteContextOf(siteRole: string) {
  return {
    site: { id: 7, slug: 'site-a' },
    session: { user: { id: '1', role: 'editor', siteRoles: [{ slug: 'site-a', role: siteRole }] } },
    siteRole,
  };
}

function resultRequest(body: unknown) {
  return new Request('http://localhost/api/site-a/admin/users/import/result', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validResult = {
  created: [{ email: 'a@example.com', name: '王小明', phone: '0912345678', password: 'ab3k9z', generated: true }],
  skipped: [{ email: 'b@example.com', reason: '已是本站成員' }],
  errors: [{ rowNumber: 4, email: 'c@example.com', reason: 'Email 格式不正確' }],
};

describe('member import result API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('editor'));
  });

  it('returns an xlsx result download', async () => {
    const response = await POST(resultRequest(validResult), context);
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('spreadsheetml.sheet');
    expect(response.headers.get('Content-Disposition')).toContain('member-import-result.xlsx');
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await POST(resultRequest(validResult), context);

    expect(response.status).toBe(403);
  });

  it('rejects a malformed payload', async () => {
    const response = await POST(resultRequest({ created: [{ email: 1 }] }), context);

    expect(response.status).toBe(400);
  });

  it('rejects an empty payload', async () => {
    const response = await POST(resultRequest({ created: [], skipped: [], errors: [] }), context);

    expect(response.status).toBe(400);
  });
});
