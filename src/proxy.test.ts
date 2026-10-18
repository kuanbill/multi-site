import { describe, expect, it } from 'vitest';
import { decideProxyRoute, type ProxyToken } from './proxy';

const adminToken: ProxyToken = { authType: 'admin', role: 'admin' };
const siteToken: ProxyToken = { authType: 'site', role: 'editor' };

describe('authentication boundary proxy decisions', () => {
  it('allows only the admin session into admin routes', () => {
    expect(decideProxyRoute('/admin', adminToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/admin', siteToken, null)).toEqual({ action: 'redirect', location: '/admin/login' });
    expect(decideProxyRoute('/admin', null, siteToken)).toEqual({ action: 'redirect', location: '/admin/login' });
  });

  it('keeps both auth handlers public', () => {
    expect(decideProxyRoute('/admin/login', null, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/admin/auth/session', null, siteToken)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/auth/session', null, adminToken)).toEqual({ action: 'allow' });
  });

  it('rejects site sessions from admin APIs', () => {
    expect(decideProxyRoute('/api/admin/sites', null, siteToken)).toEqual({ action: 'forbidden' });
    expect(decideProxyRoute('/api/admin/sites', adminToken, null)).toEqual({ action: 'allow' });
  });

  it('redirects legacy admin paths without rendering their old UI', () => {
    expect(decideProxyRoute('/site-a/admin/users', adminToken, null)).toEqual({
      action: 'redirect',
      location: '/admin/sites/site-a/users',
    });
    expect(decideProxyRoute('/site-a/admin/users', null, siteToken)).toEqual({
      action: 'redirect',
      location: '/admin/login',
    });
    expect(decideProxyRoute('/login', null, null)).toEqual({ action: 'redirect', location: '/admin/login' });
    expect(decideProxyRoute('/register', null, null)).toEqual({ action: 'redirect', location: '/admin/login' });
  });
});
