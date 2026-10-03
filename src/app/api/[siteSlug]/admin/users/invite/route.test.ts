import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSiteContext, hash, userFindUnique, userCreate, siteUserCount, siteUserFindFirst, siteUserCreate } =
  vi.hoisted(() => ({
    requireSiteContext: vi.fn(),
    hash: vi.fn(),
    userFindUnique: vi.fn(),
    userCreate: vi.fn(),
    siteUserCount: vi.fn(),
    siteUserFindFirst: vi.fn(),
    siteUserCreate: vi.fn(),
  }));

vi.mock('@/lib/contentAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contentAccess')>()),
  requireSiteContext,
}));
vi.mock('bcryptjs', () => ({ hash }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, create: userCreate },
    siteUser: { count: siteUserCount, findFirst: siteUserFindFirst, create: siteUserCreate },
  },
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

function invite(body: unknown) {
  return POST(
    new Request('http://localhost/api/site-a/admin/users/invite', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context,
  );
}

const validBody = { email: 'new@example.com', name: '新成員', role: 'editor' };

describe('site member invite API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('admin'));
    hash.mockReset().mockResolvedValue('hashed');
    userFindUnique.mockReset().mockResolvedValue(null);
    userCreate.mockReset().mockResolvedValue({ id: 11, email: 'new@example.com', name: '新成員' });
    siteUserCount.mockReset().mockResolvedValue(0);
    siteUserFindFirst.mockReset().mockResolvedValue(null);
    siteUserCreate.mockReset().mockResolvedValue({ id: 501, role: 'editor' });
  });

  it('lets an editor invite an editor member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await invite(validBody);

    expect(response.status).toBe(201);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 11, siteId: 7, role: 'editor' } });
  });

  it('lets an editor invite a viewer member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await invite({ ...validBody, role: 'viewer' });

    expect(response.status).toBe(201);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 11, siteId: 7, role: 'viewer' } });
  });

  it('stops an editor from inviting a site admin', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await invite({ ...validBody, role: 'admin' });

    expect(response.status).toBe(403);
    expect(userCreate).not.toHaveBeenCalled();
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('lets a site admin invite a site admin', async () => {
    const response = await invite({ ...validBody, role: 'admin' });

    expect(response.status).toBe(201);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 11, siteId: 7, role: 'admin' } });
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await invite(validBody);

    expect(response.status).toBe(403);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('requires a name and an email', async () => {
    const response = await invite({ email: 'new@example.com' });

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('rejects a short password', async () => {
    const response = await invite({ ...validBody, password: '123' });

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('links an existing account instead of creating a new user', async () => {
    userFindUnique.mockResolvedValue({ id: 12, email: 'new@example.com', name: '既有帳號', role: 'editor' });
    siteUserCount.mockResolvedValue(0);

    const response = await invite(validBody);

    expect(response.status).toBe(201);
    expect(userCreate).not.toHaveBeenCalled();
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 12, siteId: 7, role: 'editor' } });
  });

  it('rejects an account that already belongs to another site', async () => {
    userFindUnique.mockResolvedValue({ id: 12, email: 'new@example.com', name: '既有帳號', role: 'editor' });
    siteUserCount.mockResolvedValue(1);

    const response = await invite(validBody);

    expect(response.status).toBe(409);
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('rejects an account already in this site', async () => {
    userFindUnique.mockResolvedValue({ id: 12, email: 'new@example.com', name: '既有帳號', role: 'editor' });
    siteUserCount.mockResolvedValue(1);
    siteUserFindFirst.mockResolvedValue({ userId: 12, siteId: 7, role: 'editor' });

    const response = await invite(validBody);

    expect(response.status).toBe(409);
    expect(siteUserCreate).not.toHaveBeenCalled();
  });
});