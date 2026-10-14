const SESSION_COOKIE_NAME = /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?=/i;

export function makeSessionCookieBrowserSession(setCookieHeaders: string[]): string[] {
  return setCookieHeaders.map((header) => {
    if (!SESSION_COOKIE_NAME.test(header)) return header;

    return header.replace(/;\s*(?:expires|max-age)=[^;]*/gi, '');
  });
}
