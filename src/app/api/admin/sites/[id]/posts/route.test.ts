import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminSession, findMany, create } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAdminSession }));
vi.mock('@/lib/prisma', () => ({ prisma: { post: { findMany, create } } }));

import { GET } from './route';

describe('global site posts API authorization', () => {
  beforeEach(() => {
    getAdminSession.mockReset().mockResolvedValue(null);
    findMany.mockReset().mockResolvedValue([]);
    create.mockReset();
  });

  it('rejects a non-admin before reading posts', async () => {
    const response = await GET(new Request('http://localhost/api/admin/sites/3/posts'), {
      params: Promise.resolve({ id: '3' }),
    });

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});
