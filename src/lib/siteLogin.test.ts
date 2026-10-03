import { describe, expect, it } from 'vitest';
import type { Session } from 'next-auth';
import {
  MEMBERS_ONLY_NOTICE,
  NOT_MEMBER_NOTICE,
  resolveSiteLoginState,
  resolveSiteLoginTarget,
} from './siteLogin';

function sessionOf(role: string, slugs: string[]): Session {
  return {
    user: {
      id: '1',
      role,
      siteRoles: slugs.map((slug) => ({ siteId: 1, slug, role: 'viewer' })),
    },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

function unlimitedEditorSession(): Session {
  return {
    user: { id: '1', role: 'editor', allSites: true, siteRoles: [] },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

const base = { siteSlug: 'site-a', callbackUrl: null, reason: null, error: null };

describe('resolveSiteLoginState', () => {
  it('shows the members-only notice for anonymous visitors', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: null,
      reason: 'members-only',
      callbackUrl: '/site-a/meeting',
    });

    expect(state.mode).toBe('form');
    expect(state.notice).toBe(MEMBERS_ONLY_NOTICE);
    expect(state.safeCallbackUrl).toBe('/site-a/meeting');
  });

  it('shows the not-member notice after the automatic sign-out', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: null,
      error: 'not-member',
    });

    expect(state.mode).toBe('form');
    expect(state.notice).toBe(NOT_MEMBER_NOTICE);
    expect(state.safeCallbackUrl).toBeNull();
  });

  it('shows no notice for a plain login visit', () => {
    const state = resolveSiteLoginState({ ...base, session: null });

    expect(state.mode).toBe('form');
    expect(state.notice).toBeNull();
    expect(state.safeCallbackUrl).toBeNull();
  });

  it('redirects an existing member without showing the form', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: sessionOf('editor', ['site-a']),
      callbackUrl: '/site-a/announcement/first',
    });

    expect(state.mode).toBe('redirect-member');
    expect(state.safeCallbackUrl).toBe('/site-a/announcement/first');
  });

  it('redirects a global admin without showing the form', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: sessionOf('admin', []),
      callbackUrl: '/site-a',
    });

    expect(state.mode).toBe('redirect-member');
    expect(state.safeCallbackUrl).toBe('/site-a');
  });

  it('redirects an unlimited editor without showing the form', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: unlimitedEditorSession(),
      callbackUrl: '/site-a',
    });

    expect(state.mode).toBe('redirect-member');
    expect(state.safeCallbackUrl).toBe('/site-a');
  });

  it('requires a sign-out for a viewer carrying the unlimited flag', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: { ...sessionOf('viewer', []), user: { ...sessionOf('viewer', []).user, allSites: true } },
      callbackUrl: '/site-a',
    });

    expect(state.mode).toBe('needs-signout');
  });

  it('requires a sign-out for a logged-in non-member', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: sessionOf('editor', ['site-b']),
      callbackUrl: '/site-a/meeting',
    });

    expect(state.mode).toBe('needs-signout');
    expect(state.notice).toBe(NOT_MEMBER_NOTICE);
    expect(state.safeCallbackUrl).toBe('/site-a/meeting');
  });

  it('drops unsafe callback urls', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: sessionOf('editor', ['site-a']),
      callbackUrl: '//evil.com',
    });

    expect(state.mode).toBe('redirect-member');
    expect(state.safeCallbackUrl).toBeNull();
  });

  it('drops callback urls that point at another site', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: null,
      callbackUrl: '/site-b/meeting',
    });

    expect(state.safeCallbackUrl).toBeNull();
  });
});

describe('resolveSiteLoginTarget', () => {
  it('prefers the safe callback url', () => {
    const state = resolveSiteLoginState({
      ...base,
      session: null,
      callbackUrl: '/site-a/meeting',
    });

    expect(resolveSiteLoginTarget(state, 'site-a')).toBe('/site-a/meeting');
  });

  it('falls back to the site admin when there is no callback', () => {
    const state = resolveSiteLoginState({ ...base, session: null });

    expect(resolveSiteLoginTarget(state, 'site-a')).toBe('/site-a/admin');
  });
});
