import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  hash,
  siteFindUnique,
  siteUserFindFirst,
  siteUserCount,
  siteUserUpdate,
  userFindFirst,
  userUpdate,
  transaction,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  hash: vi.fn(),
  siteFindUnique: vi.fn(),
  siteUserFindFirst: vi.fn(),
  siteUserCount: vi.fn(),
  siteUserUpdate: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('bcryptjs', () => ({ hash }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    site: { findUnique: siteFindUnique },
    siteUser: { findFirst: siteUserFindFirst, count: siteUserCount, update: siteUserUpdate },
    user: { findFirst: userFindFirst, update: userUpdate },
    $transaction: transaction,
  },
}));

import { PUT } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

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

const validBody = { userId: 5, name: '王小明', email: 'ming@example.com', role: 'viewer' };

describe('site member update API', () => {
  beforeEach(() => {
    getServerSession.mockReset().mockResolvedValue({
      user: { role: 'editor', siteRoles: [{ slug: 'site-a', role: 'admin' }] },
    });
    hash.mockReset().mockResolvedValue('hashed');
    siteFindUnique.mockReset().mockResolvedValue({ id: 7, slug: 'site-a' });
    siteUserFindFirst.mockReset().mockResolvedValue({ id: 99, role: 'editor' });
    siteUserCount.mockReset().mockResolvedValue(2);
    userFindFirst.mockReset().mockResolvedValue(null);
    userUpdate.mockReset().mockResolvedValue({ id: 5, name: '王小明', email: 'ming@example.com', role: 'editor', createdAt: new Date() });
    siteUserUpdate.mockReset().mockResolvedValue({ id: 99, role: 'viewer' });
    transaction.mockReset().mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('rejects a member who is not a site admin', async () => {
    getServerSession.mockResolvedValue({
      user: { role: 'editor', siteRoles: [{ slug: 'site-a', role: 'editor' }] },
    });

    const response = await put(validBody);

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('updates the site role and profile for an existing member', async () => {
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

  it('hashes and stores a new password only when provided', async () => {
    await put({ ...validBody, password: 'secret123' });

    expect(hash).toHaveBeenCalledWith('secret123', 12);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed' }) }),
    );
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
