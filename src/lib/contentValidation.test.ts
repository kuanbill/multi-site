import { describe, expect, it } from 'vitest';
import {
  parseContentStatus,
  validateAsset,
  validateDateRange,
  validateExternalUrl,
  validateMeetingType,
  validateProgressStatus,
  validateRequiredText,
  validateSlug,
} from './contentValidation';

describe('content validation', () => {
  it('accepts a site-scoped slug', () => {
    expect(validateSlug('public-meeting-2026')).toBe('public-meeting-2026');
  });

  it('rejects unsafe slugs', () => {
    expect(() => validateSlug('../private')).toThrow('識別碼');
  });

  it('accepts only http and https external URLs', () => {
    expect(validateExternalUrl('https://example.com')).toBe('https://example.com');
    expect(validateExternalUrl(null)).toBeNull();
    expect(() => validateExternalUrl('javascript:alert(1)')).toThrow('網址');
  });

  it('accepts and rejects content statuses', () => {
    expect(parseContentStatus('published')).toBe('published');
    expect(() => parseContentStatus('pending')).toThrow('狀態');
  });

  it('rejects blank required content fields', () => {
    expect(validateRequiredText(' 公告 ', 'title')).toBe('公告');
    expect(() => validateRequiredText('  ', 'name')).toThrow('名稱');
  });

  it('validates meeting and progress status values', () => {
    expect(validateMeetingType('board')).toBe('board');
    expect(validateProgressStatus('current')).toBe('current');
    expect(() => validateMeetingType('private')).toThrow('會議類型');
    expect(() => validateProgressStatus('paused')).toThrow('進度狀態');
  });

  it('rejects an end date before a start date', () => {
    expect(() => validateDateRange('2026-09-23', '2026-09-22')).toThrow('結束日期');
  });

  it('allows image and PDF assets only', () => {
    expect(validateAsset(new File(['image'], 'hero.png', { type: 'image/png' }))).toEqual({
      extension: 'png',
      mimeType: 'image/png',
    });
    expect(validateAsset(new File(['pdf'], 'minutes.pdf', { type: 'application/pdf' }))).toEqual({
      extension: 'pdf',
      mimeType: 'application/pdf',
    });
    expect(() => validateAsset(new File(['script'], 'script.js', { type: 'text/javascript' }))).toThrow('檔案');
  });

  it('derives safe extensions from MIME types regardless of client filename', () => {
    expect(validateAsset(new File(['image'], 'payload.bin', { type: 'image/png' }))).toEqual({
      extension: 'png',
      mimeType: 'image/png',
    });
    expect(validateAsset(new File(['pdf'], 'payload', { type: 'application/pdf' }))).toEqual({
      extension: 'pdf',
      mimeType: 'application/pdf',
    });
  });

});
