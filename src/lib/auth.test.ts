import { beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique, siteUserFindFirst, siteUserFindMany, siteFindUnique, compare, loginRecordCreate } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  siteUserFindFirst: vi.fn(),
  siteUserFindMany: vi.fn(),
  siteFindUnique: vi.fn(),
  compare: vi.fn(),
  loginRecordCreate: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    siteUser: { findFirst: siteUserFindFirst, findMany: siteUserFindMany },
    site: { findUnique: siteFindUnique },
    loginRecord: { create: loginRecordCreate },
  },
}));
vi.mock('bcryptjs', () => ({ compare }));

import { authOptions } from './auth';

const credentialsProvider = authOptions.providers[0] as unknown as {
  options: { authorize: (credentials: Record<string, string>) => Promise<unknown> };
};

const siteRow = { id: 3, slug: 'site-a' };

function mockUser(overrides: Record<string, unknown> = {}) {
  userFindUnique.mockResolvedValue({
    id: 9,
    email: 'editor@example.com',
    name: '編輯者',
    password: 'hashed',
    role: 'editor',
    allSites: false,
    ...overrides,
  });
  compare.mockResolvedValue(true);
}

describe('site login authorization', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    siteUserFindFirst.mockReset().mockResolvedValue(null);
    siteUserFindMany.mockReset().mockResolvedValue([]);
    siteFindUnique.mockReset().mockResolvedValue(siteRow);
    compare.mockReset().mockResolvedValue(true);
  });

  it('admits an unlimited editor with no site membership', async () => {
    mockUser({ allSites: true });

    await expect(
      credentialsProvider.options.authorize({
        email: 'editor@example.com',
        password: 'pw',
        siteSlug: 'site-a',
      }),
    ).resolves.toMatchObject({ id: '9', role: 'editor', allSites: true });
  });

  it('rejects an editor with no site membership', async () => {
    mockUser();

    await expect(
      credentialsProvider.options.authorize({
        email: 'editor@example.com',
        password: 'pw',
        siteSlug: 'site-a',
      }),
    ).rejects.toThrow();
  });

  it('admits an editor that has an explicit site membership', async () => {
    mockUser();
    siteUserFindFirst.mockResolvedValue({ userId: 9, siteId: 3, role: 'editor' });
    siteUserFindMany.mockResolvedValue([
      { role: 'editor', site: { id: 3, slug: 'site-a' } },
    ]);

    await expect(
      credentialsProvider.options.authorize({
        email: 'editor@example.com',
        password: 'pw',
        siteSlug: 'site-a',
      }),
    ).resolves.toMatchObject({ id: '9', loginSiteId: 3 });
  });

  it('exposes the allSites flag on the authorized user', async () => {
    mockUser({ role: 'viewer', allSites: false });

    await expect(
      credentialsProvider.options.authorize({ email: 'editor@example.com', password: 'pw' }),
    ).resolves.toMatchObject({ allSites: false, loginSiteId: null });
  });

  it('associates a global-form login with the only site of a regular member', async () => {
    mockUser({ role: 'viewer' });
    siteUserFindMany.mockResolvedValue([
      { role: 'viewer', siteId: 3, site: { id: 3, slug: 'site-a' } },
    ]);

    await expect(
      credentialsProvider.options.authorize({ email: 'editor@example.com', password: 'pw' }),
    ).resolves.toMatchObject({ loginSiteId: 3 });
  });
});

describe('login record event', () => {
  const signInEvent = authOptions.events?.signIn;
  const signInParams = (userId: string, loginSiteId: number | null = null) =>
    ({ user: { id: userId, loginSiteId } }) as Parameters<NonNullable<typeof signInEvent>>[0];

  beforeEach(() => {
    loginRecordCreate.mockReset().mockResolvedValue({ id: 1 });
  });

  it('records a login for the signed-in user', async () => {
    await signInEvent?.(signInParams('9'));

    expect(loginRecordCreate).toHaveBeenCalledWith({ data: { userId: 9, siteId: null } });
  });

  it('records the subsite for a site-specific login', async () => {
    await signInEvent?.(signInParams('9', 3));

    expect(loginRecordCreate).toHaveBeenCalledWith({ data: { userId: 9, siteId: 3 } });
  });

  it('never throws when the record write fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loginRecordCreate.mockRejectedValue(new Error('db down'));

    await expect(signInEvent?.(signInParams('9'))).resolves.toBeUndefined();

    errorSpy.mockRestore();
  });
});
