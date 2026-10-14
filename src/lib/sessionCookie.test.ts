import { describe, expect, it } from 'vitest';
import { makeSessionCookieBrowserSession } from './sessionCookie';

describe('makeSessionCookieBrowserSession', () => {
  it('removes persistent expiry attributes only from NextAuth session cookies', () => {
    const cookies = [
      '__Secure-next-auth.session-token=jwt; Path=/; Expires=Wed, 14 Oct 2026 12:00:00 GMT; HttpOnly; Secure',
      'next-auth.session-token.0=chunk; Path=/; Max-Age=2592000; SameSite=Lax',
      'next-auth.csrf-token=csrf; Path=/; Max-Age=3600',
    ];

    expect(makeSessionCookieBrowserSession(cookies)).toEqual([
      '__Secure-next-auth.session-token=jwt; Path=/; HttpOnly; Secure',
      'next-auth.session-token.0=chunk; Path=/; SameSite=Lax',
      'next-auth.csrf-token=csrf; Path=/; Max-Age=3600',
    ]);
  });
});
