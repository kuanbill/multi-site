import { describe, expect, it } from 'vitest';
import { canPerformContentAction } from './contentAccess';

describe('content permissions', () => {
  it('allows the documented action matrix', () => {
    expect(canPerformContentAction('global-admin', 'delete')).toBe(true);
    expect(canPerformContentAction('admin', 'delete')).toBe(true);
    expect(canPerformContentAction('editor', 'publish')).toBe(true);
    expect(canPerformContentAction('editor', 'delete')).toBe(false);
    expect(canPerformContentAction('viewer', 'read')).toBe(true);
    expect(canPerformContentAction('viewer', 'write')).toBe(false);
  });
});
