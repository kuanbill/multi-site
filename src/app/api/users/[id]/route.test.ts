import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  userFindUnique,
  userFindFirst,
  userUpdate,
  userCount,
  siteFindUnique,
  siteUserCreate,
  siteUserDeleteMany,
  transaction,
  getAdminSession,
  hash,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  userCount: vi.fn(),
  siteFindUnique: vi.fn(),
  siteUserCreate: vi.fn(),
  siteUserDeleteMany: vi.fn(),
  transaction: vi.fn(),
  getAdminSession: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, findFirst: userFindFirst, update: userUpdate, count: userCount },
    site: { findUnique: siteFindUnique },
    siteUser: { create: siteUserCreate, deleteMany: siteUserDeleteMany },
    $transaction: transaction,
  },
}));
vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('bcryptjs', () => ({ hash }));

import { PATCH, PUT } from './route';

const routeContext = { params: Promise.resolve({ id: '9' }) };

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/users/9', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function putRequest(body: unknown) {
  return new Request('http://localhost/api/users/9', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validUser(overrides: Record<string, unknown> = {}) {
  return { name: '編輯者', email: 'editor@example.com', role: 'editor', ...overrides };
}

describe('updating a user profile', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue({ user: { id: '1', role: 'admin' } });
    userFindUnique.mockReset().mockResolvedValue({ role: 'editor' });
    userFindFirst.mockReset().mockResolvedValue(null);
    userUpdate.mockReset().mockResolvedValue({ id: 9, role: 'editor' });
    userCount.mockReset().mockResolvedValue(2);
    siteFindUnique.mockReset().mockResolvedValue({ id: 3, slug: 'site-a' });
    siteUserCreate.mockReset().mockResolvedValue({});
    siteUserDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    hash.mockReset().mockResolvedValue('hashed');
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: { update: userUpdate },
        siteUser: { create: siteUserCreate, deleteMany: siteUserDeleteMany },
      }),
    );
  });

  it('turns an editor into an unlimited editor', async () => {
    const response = await PUT(putRequest(validUser({ allSites: true })), routeContext);

    expect(response.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ allSites: true }) }),
    );
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('rejects the unlimited flag for a viewer', async () => {
    const response = await PUT(putRequest(validUser({ role: 'viewer', allSites: true })), routeContext);

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('clears the membership when an editor becomes unlimited', async () => {
    await PUT(putRequest(validUser({ allSites: true })), routeContext);

    expect(siteUserDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 9 } }));
  });

  it('rejects combining the unlimited flag with a single site', async () => {
    const response = await PUT(putRequest(validUser({ allSites: true, siteId: 3 })), routeContext);

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('changing the global role from the user list', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue({ user: { id: '1', role: 'admin' } });
    userFindUnique.mockReset().mockResolvedValue({ role: 'editor' });
    userUpdate.mockReset().mockResolvedValue({ id: 9, role: 'viewer' });
    userCount.mockReset().mockResolvedValue(2);
  });

  it('clears the unlimited flag when the role becomes viewer', async () => {
    const response = await PATCH(patchRequest({ role: 'viewer' }), routeContext);

    expect(response.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'viewer', allSites: false } }),
    );
  });

  it('keeps the unlimited flag untouched when the role stays editor', async () => {
    await PATCH(patchRequest({ role: 'editor' }), routeContext);

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'editor' } }),
    );
  });
});