import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminSession, findMany, create } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { page: { findMany, create } } }));

import { GET } from './route';

describe('global site pages API authorization', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue(null);
    findMany.mockReset().mockResolvedValue([]);
    create.mockReset();
  });

  it('rejects a non-admin before reading pages', async () => {
    const response = await GET(new Request('http://localhost/api/admin/sites/3/pages'), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});
