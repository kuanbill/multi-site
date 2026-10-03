import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  userFindUnique,
  userCreate,
  siteFindUnique,
  siteUserCreate,
  transaction,
  getAdminSession,
  hash,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  siteFindUnique: vi.fn(),
  siteUserCreate: vi.fn(),
  transaction: vi.fn(),
  getAdminSession: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, create: userCreate },
    site: { findUnique: siteFindUnique },
    siteUser: { create: siteUserCreate },
    $transaction: transaction,
  },
}));
vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('bcryptjs', () => ({ hash }));

import { POST } from './route';

function jsonRequest(url: string, body: unknown, method = 'POST') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validUser(overrides: Record<string, unknown> = {}) {
  return {
    name: '編輯者',
    email: 'editor@example.com',
    password: 'secret1',
    role: 'editor',
    ...overrides,
  };
}

describe('creating a user', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue({ user: { id: '1', role: 'admin' } });
    userFindUnique.mockReset().mockResolvedValue(null);
    siteFindUnique.mockReset().mockResolvedValue({ id: 3, slug: 'site-a' });
    hash.mockReset().mockResolvedValue('hashed');
    userCreate.mockReset().mockResolvedValue({ id: 9, name: '編輯者', email: 'editor@example.com', role: 'editor' });
    siteUserCreate.mockReset().mockResolvedValue({});
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: { create: userCreate },
        siteUser: { create: siteUserCreate, deleteMany: vi.fn() },
      }),
    );
  });

  it('creates an unlimited editor without any site membership', async () => {
    const response = await POST(jsonRequest('http://localhost/api/users', validUser({ allSites: true })));

    expect(response.status).toBe(201);
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ allSites: true }) }),
    );
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('rejects the unlimited flag for a viewer', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/users', validUser({ role: 'viewer', allSites: true })),
    );

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('rejects combining the unlimited flag with a single site', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/users', validUser({ allSites: true, siteId: 3 })),
    );

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('stores the unlimited flag as false when it is not requested', async () => {
    await POST(jsonRequest('http://localhost/api/users', validUser({ siteId: 3 })));

    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ allSites: false }) }),
    );
    expect(siteUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 9, siteId: 3, role: 'editor' } }),
    );
  });
});