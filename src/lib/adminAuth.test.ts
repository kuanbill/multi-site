import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, userFindUnique, siteUserFindMany, compare } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
  siteUserFindMany: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('bcryptjs', () => ({ compare }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    siteUser: { findMany: siteUserFindMany },
  },
}));

import { adminAuthOptions, getAdminSession } from './adminAuth';

const credentialsProvider = adminAuthOptions.providers[0] as unknown as {
  options: { authorize: (credentials: Record<string, string>) => Promise<unknown> };
};

describe('admin session authorization', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    userFindUnique.mockReset();
    siteUserFindMany.mockReset().mockResolvedValue([]);
    compare.mockReset().mockResolvedValue(true);
  });

  it('rejects an existing admin JWT after the account is downgraded', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'admin', authType: 'admin' } });
    userFindUnique.mockResolvedValue({ role: 'editor' });

    await expect(getAdminSession()).resolves.toBeNull();
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: 9 },
      select: { role: true },
    });
  });

  it('returns the session while the account is still a global admin', async () => {
    const session = { user: { id: '9', role: 'admin', authType: 'admin' } };
    getServerSession.mockResolvedValue(session);
    userFindUnique.mockResolvedValue({ role: 'admin' });

    await expect(getAdminSession()).resolves.toBe(session);
  });

  it('authenticates an assigned site manager into the admin session', async () => {
    userFindUnique.mockResolvedValue({
      id: 9,
      email: 'manager@example.com',
      name: '子網站管理者',
      password: 'hashed',
      role: 'editor',
      allSites: false,
    });
    siteUserFindMany.mockResolvedValue([
      { siteId: 3, role: 'admin', site: { id: 3, slug: 'site-a' } },
    ]);

    await expect(
      credentialsProvider.options.authorize({ email: 'manager@example.com', password: 'pw' }),
    ).resolves.toMatchObject({
      id: '9',
      role: 'editor',
      authType: 'admin',
      siteRoles: [{ siteId: 3, slug: 'site-a', role: 'admin' }],
    });
  });

  it('rejects a site manager without an assigned site', async () => {
    userFindUnique.mockResolvedValue({
      id: 9,
      email: 'manager@example.com',
      name: '子網站管理者',
      password: 'hashed',
      role: 'editor',
      allSites: false,
    });

    await expect(
      credentialsProvider.options.authorize({ email: 'manager@example.com', password: 'pw' }),
    ).rejects.toThrow('尚未指定可管理的子網站');
  });

  it('does not use allSites as an admin access bypass', async () => {
    userFindUnique.mockResolvedValue({
      id: 9,
      email: 'manager@example.com',
      name: '子網站管理者',
      password: 'hashed',
      role: 'editor',
      allSites: true,
    });

    await expect(
      credentialsProvider.options.authorize({ email: 'manager@example.com', password: 'pw' }),
    ).rejects.toThrow('尚未指定可管理的子網站');
  });
});
