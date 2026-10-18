import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminSession, findMany } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { site: { findMany } } }));

import { GET } from './route';

describe('global site listing authorization', () => {
  beforeEach(() => {
    getAdminSession.mockReset();
    findMany.mockReset().mockResolvedValue([]);
  });

  it('rejects a site session before reading global site data', async () => {
    getAdminSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('allows a global admin to list sites', async () => {
    getAdminSession.mockResolvedValue({ user: { role: 'admin' } });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalled();
  });
});
