import { describe, expect, it } from 'vitest';
import {
  canAssignSiteAdmin,
  canManageFeatureSettings,
  canManageSiteMembers,
  canManageSiteSettings,
  canPerformContentAction,
} from './contentAccess';

describe('content permissions', () => {
  it('allows the documented action matrix', () => {
    expect(canPerformContentAction('global-admin', 'delete')).toBe(true);
    expect(canPerformContentAction('admin', 'delete')).toBe(true);
    expect(canPerformContentAction('editor', 'publish')).toBe(true);
    expect(canPerformContentAction('editor', 'delete')).toBe(false);
    expect(canPerformContentAction('viewer', 'read')).toBe(true);
    expect(canPerformContentAction('viewer', 'write')).toBe(false);
  });

  it('limits site settings to site and global administrators', () => {
    expect(canManageSiteSettings('global-admin')).toBe(true);
    expect(canManageSiteSettings('admin')).toBe(true);
    expect(canManageSiteSettings('editor')).toBe(false);
    expect(canManageSiteSettings('viewer')).toBe(false);
  });

  it('allows site editors to manage feature settings', () => {
    expect(canManageFeatureSettings('global-admin')).toBe(true);
    expect(canManageFeatureSettings('admin')).toBe(true);
    expect(canManageFeatureSettings('editor')).toBe(true);
    expect(canManageFeatureSettings('viewer')).toBe(false);
  });
});

describe('site member management permissions', () => {
  it('lets admins and editors manage members but not viewers', () => {
    expect(canManageSiteMembers('global-admin')).toBe(true);
    expect(canManageSiteMembers('admin')).toBe(true);
    expect(canManageSiteMembers('editor')).toBe(true);
    expect(canManageSiteMembers('viewer')).toBe(false);
  });

  it('reserves site admin assignment for site and global admins', () => {
    expect(canAssignSiteAdmin('global-admin')).toBe(true);
    expect(canAssignSiteAdmin('admin')).toBe(true);
    expect(canAssignSiteAdmin('editor')).toBe(false);
    expect(canAssignSiteAdmin('viewer')).toBe(false);
  });
});
