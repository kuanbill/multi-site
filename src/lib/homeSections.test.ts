import { describe, expect, it } from 'vitest';
import {
  HOME_SECTION_SOURCES,
  PROGRESS_SECTION_FILTERS,
  resolveSectionVisibility,
  resolveSourceFeatureKey,
  validateHomeSectionInput,
} from './homeSections';

describe('resolveSectionVisibility', () => {
  it('shows a public section to everyone', () => {
    expect(resolveSectionVisibility('public', false)).toBe('show');
    expect(resolveSectionVisibility('public', true)).toBe('show');
  });

  it('shows a members section to a member', () => {
    expect(resolveSectionVisibility('members', true)).toBe('show');
  });

  it('prompts a non-member to log in instead of showing data', () => {
    expect(resolveSectionVisibility('members', false)).toBe('login-prompt');
  });

  it('hides a section whose feature is disabled', () => {
    expect(resolveSectionVisibility('disabled', true)).toBe('hide');
    expect(resolveSectionVisibility('disabled', false)).toBe('hide');
  });
});

describe('resolveSourceFeatureKey', () => {
  it('maps each source to the feature that governs its visibility', () => {
    expect(resolveSourceFeatureKey('announcement')).toBe('announcements');
    expect(resolveSourceFeatureKey('progress')).toBe('progress');
    expect(resolveSourceFeatureKey('page')).toBe('pages');
  });

  it('returns null for feature sections because the row already carries its own feature', () => {
    expect(resolveSourceFeatureKey('feature')).toBeNull();
  });
});

describe('validateHomeSectionInput', () => {
  const base = { sourceType: 'announcement', limit: 3 };

  it('accepts an announcement section with defaults', () => {
    expect(validateHomeSectionInput(base)).toEqual({
      sourceType: 'announcement',
      featureId: null,
      filter: 'all',
      title: null,
      limit: 3,
      showAll: true,
    });
  });

  it('rejects an unknown source type', () => {
    expect(() => validateHomeSectionInput({ ...base, sourceType: 'gallery' })).toThrow('資料來源');
  });

  it('requires a feature for feature sections', () => {
    expect(() => validateHomeSectionInput({ sourceType: 'feature' })).toThrow('功能');
  });

  it('rejects a feature section whose feature is missing or invalid', () => {
    expect(() => validateHomeSectionInput({ sourceType: 'feature', featureId: 0 })).toThrow('功能');
    expect(() => validateHomeSectionInput({ sourceType: 'feature', featureId: 'abc' })).toThrow('功能');
  });

  it('accepts a feature section with a valid feature id', () => {
    expect(validateHomeSectionInput({ sourceType: 'feature', featureId: 4 }).featureId).toBe(4);
  });

  it('rejects a feature id on a non-feature section', () => {
    expect(() => validateHomeSectionInput({ ...base, featureId: 4 })).toThrow('功能');
  });

  it('rejects a limit outside the 1 to 12 range', () => {
    expect(() => validateHomeSectionInput({ ...base, limit: 0 })).toThrow('筆數');
    expect(() => validateHomeSectionInput({ ...base, limit: 13 })).toThrow('筆數');
    expect(() => validateHomeSectionInput({ ...base, limit: 2.5 })).toThrow('筆數');
  });

  it('accepts a current-stage filter only for progress sections', () => {
    expect(validateHomeSectionInput({ sourceType: 'progress', filter: 'current' }).filter).toBe('current');
    expect(() => validateHomeSectionInput({ ...base, filter: 'current' })).toThrow('篩選');
  });

  it('rejects an unknown progress filter', () => {
    expect(() => validateHomeSectionInput({ sourceType: 'progress', filter: 'draft' })).toThrow('篩選');
  });

  it('normalizes an empty title to null and keeps a real title', () => {
    expect(validateHomeSectionInput({ ...base, title: '   ' }).title).toBeNull();
    expect(validateHomeSectionInput({ ...base, title: ' 本週公告 ' }).title).toBe('本週公告');
  });

  it('treats a missing showAll as true', () => {
    expect(validateHomeSectionInput({ ...base, showAll: false }).showAll).toBe(false);
    expect(validateHomeSectionInput(base).showAll).toBe(true);
  });
});

describe('section source constants', () => {
  it('exposes exactly the four supported sources', () => {
    expect([...HOME_SECTION_SOURCES]).toEqual(['feature', 'announcement', 'progress', 'page']);
  });

  it('exposes the progress filters', () => {
    expect([...PROGRESS_SECTION_FILTERS]).toEqual(['current', 'all']);
  });
});