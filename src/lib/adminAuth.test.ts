import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, userFindUnique } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFindUnique } } }));

import { getAdminSession } from './adminAuth';

describe('admin session authorization', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    userFindUnique.mockReset();
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
});
