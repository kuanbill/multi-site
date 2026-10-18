import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique, siteFindUnique, siteUserFindFirst, siteUserFindMany, compare } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  siteFindUnique: vi.fn(),
  siteUserFindFirst: vi.fn(),
  siteUserFindMany: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    site: { findUnique: siteFindUnique },
    siteUser: { findFirst: siteUserFindFirst, findMany: siteUserFindMany },
    loginRecord: { create: vi.fn() },
  },
}));
vi.mock('bcryptjs', () => ({ compare }));

import { authOptions, siteAuthOptions } from './auth';
import { adminAuthOptions } from './adminAuth';

type CredentialsProvider = {
  options: {
    authorize: (credentials: Record<string, string>) => Promise<unknown>;
  };
};

const siteProvider = authOptions.providers[0] as unknown as CredentialsProvider;
const adminProvider = adminAuthOptions.providers[0] as unknown as CredentialsProvider;

function mockUser(overrides: Record<string, unknown> = {}) {
  userFindUnique.mockResolvedValue({
    id: 9,
    email: 'member@example.com',
    name: '成員',
    password: 'hashed',
    role: 'editor',
    allSites: false,
    ...overrides,
  });
  compare.mockResolvedValue(true);
}

describe('frontend and backend auth boundaries', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    siteFindUnique.mockReset().mockResolvedValue({ id: 3, slug: 'site-a' });
    siteUserFindFirst.mockReset().mockResolvedValue({ userId: 9, siteId: 3, role: 'admin' });
    siteUserFindMany.mockReset().mockResolvedValue([
      { role: 'admin', site: { id: 3, slug: 'site-a' } },
    ]);
    compare.mockReset().mockResolvedValue(true);
  });

  it('uses different cookie names for site and admin sessions', () => {
    expect(siteAuthOptions.cookies?.sessionToken?.name).toBe('site-session-token');
    expect(siteAuthOptions.cookies?.csrfToken?.name).toBe('site-csrf-token');
    expect(siteAuthOptions.cookies?.callbackUrl?.name).toBe('site-callback-url');
    expect(adminAuthOptions.cookies?.sessionToken?.name).toBe('admin-session-token');
    expect(adminAuthOptions.cookies?.csrfToken?.name).toBe('admin-csrf-token');
    expect(adminAuthOptions.cookies?.callbackUrl?.name).toBe('admin-callback-url');
  });

  it('allows a site member through the site login provider', async () => {
    mockUser();

    await expect(
      siteProvider.options.authorize({
        email: 'member@example.com',
        password: 'pw',
        siteSlug: 'site-a',
      }),
    ).resolves.toMatchObject({ id: '9', role: 'editor' });
  });

  it('rejects a site-admin membership through the admin login provider', async () => {
    mockUser({ role: 'editor' });

    await expect(
      adminProvider.options.authorize({ email: 'member@example.com', password: 'pw' }),
    ).rejects.toThrow();
  });

  it('allows only a global admin through the admin login provider', async () => {
    mockUser({ role: 'admin' });

    await expect(
      adminProvider.options.authorize({ email: 'member@example.com', password: 'pw' }),
    ).resolves.toMatchObject({ id: '9', role: 'admin' });
  });

  it('marks the JWT with the matching authentication type', async () => {
    const siteToken = await siteAuthOptions.callbacks!.jwt!({
      token: {},
      user: { id: '9', role: 'editor', authType: 'site', siteRoles: [] },
    } as never);
    const adminToken = await adminAuthOptions.callbacks!.jwt!({
      token: {},
      user: { id: '9', role: 'admin', authType: 'admin' },
    } as never);

    expect(siteToken).toMatchObject({ authType: 'site' });
    expect(adminToken).toMatchObject({ authType: 'admin' });
  });
});
