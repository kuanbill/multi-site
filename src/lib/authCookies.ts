import type { CookiesOptions } from 'next-auth';

type AuthCookiePrefix = 'site' | 'admin';

const sharedOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

export function createAuthCookies(prefix: AuthCookiePrefix): Pick<CookiesOptions, 'sessionToken' | 'csrfToken' | 'callbackUrl'> {
  return {
    sessionToken: {
      name: `${prefix}-session-token`,
      options: sharedOptions,
    },
    csrfToken: {
      name: `${prefix}-csrf-token`,
      options: sharedOptions,
    },
    callbackUrl: {
      name: `${prefix}-callback-url`,
      options: {
        ...sharedOptions,
        httpOnly: false,
      },
    },
  };
}

export const siteAuthCookies = createAuthCookies('site');
export const adminAuthCookies = createAuthCookies('admin');
