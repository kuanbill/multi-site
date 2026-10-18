import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique, userCreate, hash } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  hash: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFindUnique, create: userCreate } } }));
vi.mock('bcryptjs', () => ({ hash }));

import { POST } from './route';

describe('legacy registration boundary', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    userCreate.mockReset();
    hash.mockReset();
  });

  it('rejects anonymous registration instead of creating a backend account', async () => {
    const response = await POST();

    expect(response.status).toBe(403);
    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });
});
