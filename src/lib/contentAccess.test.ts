import { describe, expect, it } from 'vitest';
import { canManageSiteSettings, canPerformContentAction } from './contentAccess';

describe('content permissions', () => {
  it('allows the documented action matrix', () => {
    expect(canPerformContentAction('global-admin', 'delete')).toBe(true);
    expect(canPerformContentAction('admin', 'delete')).toBe(true);
    expect(canPerformContentAction('editor', 'publish')).toBe(true);
    expect(canPerformContentAction('editor', 'delete')).toBe(false);
    expect(canPerformContentAction('viewer', 'read')).toBe(true);
    expect(canPerformContentAction('viewer', 'write')).toBe(false);
  });

  it('limits feature settings to site and global administrators', () => {
    expect(canManageSiteSettings('global-admin')).toBe(true);
    expect(canManageSiteSettings('admin')).toBe(true);
    expect(canManageSiteSettings('editor')).toBe(false);
    expect(canManageSiteSettings('viewer')).toBe(false);
  });
});
