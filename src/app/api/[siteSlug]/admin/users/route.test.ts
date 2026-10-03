import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireSiteContext,
  hash,
  siteUserFindFirst,
  siteUserCount,
  siteUserUpdate,
  siteUserFindMany,
  siteUserDeleteMany,
  userFindFirst,
  userUpdate,
  transaction,
} = vi.hoisted(() => ({
  requireSiteContext: vi.fn(),
  hash: vi.fn(),
  siteUserFindFirst: vi.fn(),
  siteUserCount: vi.fn(),
  siteUserUpdate: vi.fn(),
  siteUserFindMany: vi.fn(),
  siteUserDeleteMany: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/contentAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contentAccess')>()),
  requireSiteContext,
}));
vi.mock('bcryptjs', () => ({ hash }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteUser: {
      findFirst: siteUserFindFirst,
      count: siteUserCount,
      update: siteUserUpdate,
      findMany: siteUserFindMany,
      deleteMany: siteUserDeleteMany,
    },
    user: { findFirst: userFindFirst, update: userUpdate },
    $transaction: transaction,
  },
}));

import { DELETE, GET, PUT } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function siteContextOf(siteRole: string) {
  return {
    site: { id: 7, slug: 'site-a' },
    session: { user: { id: '1', role: 'editor', siteRoles: [{ slug: 'site-a', role: siteRole }] } },
    siteRole,
  };
}

function put(body: unknown) {
  return PUT(
    new Request('http://localhost/api/site-a/admin/users', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context,
  );
}

function del(userId: number) {
  return DELETE(
    new Request(`http://localhost/api/site-a/admin/users?userId=${userId}`, { method: 'DELETE' }),
    context,
  );
}

const validBody = { userId: 5, name: '王小明', email: 'ming@example.com', role: 'viewer' };

describe('site member update API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('admin'));
    hash.mockReset().mockResolvedValue('hashed');
    siteUserFindFirst.mockReset().mockResolvedValue({ id: 99, role: 'editor' });
    siteUserCount.mockReset().mockResolvedValue(2);
    userFindFirst.mockReset().mockResolvedValue(null);
    userUpdate.mockReset().mockResolvedValue({
      id: 5,
      name: '王小明',
      email: 'ming@example.com',
      role: 'editor',
      createdAt: new Date(),
    });
    siteUserUpdate.mockReset().mockResolvedValue({ id: 99, role: 'viewer' });
    transaction.mockReset().mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await put(validBody);

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('lets an editor update a non-admin member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await put(validBody);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.siteRole).toBe('viewer');
    expect(siteUserUpdate).toHaveBeenCalledWith({
      where: { userId_siteId: { userId: 5, siteId: 7 } },
      data: { role: 'viewer' },
      select: { id: true, role: true },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { name: '王小明', email: 'ming@example.com' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  });

  it('lets an editor change the name, email and password of a member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    await put({ ...validBody, name: '王小華', email: 'hua@example.com', password: 'secret123' });

    expect(hash).toHaveBeenCalledWith('secret123', 12);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: '王小華', email: 'hua@example.com', password: 'hashed' },
      }),
    );
  });

  it('stops an editor from promoting a member to site admin', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await put({ ...validBody, role: 'admin' });

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('stops an editor from changing a site admin member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));
    siteUserFindFirst.mockResolvedValue({ id: 99, role: 'admin' });

    const response = await put(validBody);

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is not a member of this site', async () => {
    siteUserFindFirst.mockResolvedValue(null);

    const response = await put(validBody);

    expect(response.status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects an invalid site role', async () => {
    const response = await put({ ...validBody, role: 'owner' });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 6 characters', async () => {
    const response = await put({ ...validBody, password: '123' });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects demoting the last site admin', async () => {
    siteUserFindFirst.mockResolvedValue({ id: 99, role: 'admin' });
    siteUserCount.mockResolvedValue(1);

    const response = await put({ ...validBody, role: 'editor' });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects an email already used by another account', async () => {
    userFindFirst.mockResolvedValue({ id: 6 });

    const response = await put(validBody);

    expect(response.status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('site member removal API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('admin'));
    siteUserFindFirst.mockReset().mockResolvedValue({ id: 99, role: 'editor' });
    siteUserDeleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it('lets an editor remove a non-admin member', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await del(5);

    expect(response.status).toBe(200);
    expect(siteUserDeleteMany).toHaveBeenCalledWith({
      where: { siteId: 7, userId: 5 },
    });
  });

  it('stops an editor from removing a site admin', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));
    siteUserFindFirst.mockResolvedValue({ id: 99, role: 'admin' });

    const response = await del(5);

    expect(response.status).toBe(403);
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await del(5);

    expect(response.status).toBe(403);
  });

  it('rejects a missing userId', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/site-a/admin/users', { method: 'DELETE' }),
      context,
    );

    expect(response.status).toBe(400);
  });
});

describe('site member list API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('editor'));
    siteUserFindMany.mockReset().mockResolvedValue([]);
  });

  it('lets an unlimited editor read the member list', async () => {
    requireSiteContext.mockResolvedValue({
      site: { id: 7, slug: 'site-a' },
      session: { user: { id: '2', role: 'editor', allSites: true, siteRoles: [] } },
      siteRole: 'editor',
    });
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    siteUserFindMany.mockResolvedValue([
      {
        id: 99,
        role: 'viewer',
        user: { id: 5, name: '王小明', email: 'ming@example.com', role: 'editor', createdAt },
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/site-a/admin/users', { method: 'GET' }),
      context,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      {
        siteRole: 'viewer',
        siteUserId: 99,
        user: {
          id: 5,
          name: '王小明',
          email: 'ming@example.com',
          role: 'editor',
          createdAt: createdAt.toISOString(),
        },
      },
    ]);
  });
});