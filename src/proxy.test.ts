import { describe, expect, it } from 'vitest';
import { decideProxyRoute, type ProxyToken } from './proxy';

const adminToken: ProxyToken = { authType: 'admin', role: 'admin' };
const siteToken: ProxyToken = { authType: 'site', role: 'editor' };
const managerToken: ProxyToken = {
  authType: 'admin',
  role: 'editor',
  siteRoles: [{ slug: 'site-a', role: 'admin' }],
};

describe('authentication boundary proxy decisions', () => {
  it('leaves the independent charge tool subpath to its own login', () => {
    expect(decideProxyRoute('/common_charge_tool', null, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/common_charge_tool/admin/users', null, null)).toEqual({ action: 'allow' });
  });

  it('leaves the independent bardcode service subpath to its own login', () => {
    expect(decideProxyRoute('/bardcode', null, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/bardcode/admin', null, null)).toEqual({ action: 'allow' });
  });
  it('allows an admin session and assigned site manager into admin routes', () => {
    expect(decideProxyRoute('/admin', adminToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/admin', managerToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/admin', null, siteToken)).toEqual({ action: 'redirect', location: '/admin/login' });
  });

  it('sends the legacy root entry to the dedicated admin dashboard', () => {
    expect(decideProxyRoute('/', adminToken, null)).toEqual({ action: 'redirect', location: '/admin' });
    expect(decideProxyRoute('/', null, siteToken)).toEqual({ action: 'redirect', location: '/admin/login' });
  });

  it('keeps both auth handlers public', () => {
    expect(decideProxyRoute('/admin/login', null, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/admin/auth/session', null, siteToken)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/auth/session', null, adminToken)).toEqual({ action: 'allow' });
  });

  it('rejects site sessions from admin APIs', () => {
    expect(decideProxyRoute('/api/admin/sites', null, siteToken)).toEqual({ action: 'forbidden' });
    expect(decideProxyRoute('/api/admin/sites', adminToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/site-a/admin/pages', null, siteToken)).toEqual({ action: 'forbidden' });
    expect(decideProxyRoute('/api/site-a/admin/pages', adminToken, null)).toEqual({ action: 'allow' });
  });

  it('limits site manager admin paths to assigned sites', () => {
    expect(decideProxyRoute('/admin/sites/site-a/pages', managerToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/admin/sites/site-b/pages', managerToken, null)).toEqual({ action: 'forbidden' });
    expect(decideProxyRoute('/api/site-a/admin/pages', managerToken, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/site-b/admin/pages', managerToken, null)).toEqual({ action: 'forbidden' });
    expect(decideProxyRoute('/api/admin/users', managerToken, null)).toEqual({ action: 'forbidden' });
  });

  it('lets public site APIs perform their own visibility checks', () => {
    expect(decideProxyRoute('/api/site-a/maps/3/download', null, null)).toEqual({ action: 'allow' });
    expect(decideProxyRoute('/api/site-a/maps/3/download', null, siteToken)).toEqual({ action: 'allow' });
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
