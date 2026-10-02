import { describe, expect, it } from 'vitest';
import { isSafeCallbackUrl, resolveSafeCallbackUrl } from './callbackUrl';

describe('resolveSafeCallbackUrl', () => {
  it('accepts paths inside the site', () => {
    expect(resolveSafeCallbackUrl('/site-a/meeting', 'site-a')).toBe('/site-a/meeting');
    expect(resolveSafeCallbackUrl('/site-a/meeting?tab=a%20b', 'site-a')).toBe(
      '/site-a/meeting?tab=a%20b',
    );
    expect(resolveSafeCallbackUrl('/site-a', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('/site-a/', 'site-a')).toBe('/site-a/');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(resolveSafeCallbackUrl('//evil.com', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('https://evil.com/x', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('/\\evil.com', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('javascript:alert(1)', 'site-a')).toBe('/site-a');
  });

  it('rejects other sites and missing values', () => {
    expect(resolveSafeCallbackUrl('/site-b/meeting', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('/site-a-evil/x', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl(null, 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl(undefined, 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl('', 'site-a')).toBe('/site-a');
  });

  it('rejects control characters', () => {
    expect(resolveSafeCallbackUrl('/site-a/meet\ning', 'site-a')).toBe('/site-a');
    expect(resolveSafeCallbackUrl(`/site-a/meet${String.fromCharCode(1)}ing`, 'site-a')).toBe(
      '/site-a',
    );
  });

  it('keeps the same-origin root when the site slug is empty', () => {
    expect(resolveSafeCallbackUrl('/anything', '')).toBe('/');
  });
});

describe('isSafeCallbackUrl', () => {
  it('only accepts values that pass validation unchanged', () => {
    expect(isSafeCallbackUrl('/site-a/meeting', 'site-a')).toBe(true);
    expect(isSafeCallbackUrl('//evil.com', 'site-a')).toBe(false);
    expect(isSafeCallbackUrl('/site-b/meeting', 'site-a')).toBe(false);
    expect(isSafeCallbackUrl(null, 'site-a')).toBe(false);
    expect(isSafeCallbackUrl(undefined, 'site-a')).toBe(false);
  });
});
