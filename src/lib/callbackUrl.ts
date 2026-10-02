function hasUnsafeChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * 只允許站內相對路徑作為登入後的回導目標，其餘一律退回站點首頁。
 * 拒絕 `//host`、`/\host`、絕對 URL 與控制字元，避免開放重新導向。
 */
export function resolveSafeCallbackUrl(value: string | null | undefined, siteSlug: string): string {
  const fallback = `/${siteSlug}`;
  if (!siteSlug) return '/';
  if (typeof value !== 'string' || value.length === 0) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  if (hasUnsafeChars(value)) return fallback;
  if (value !== `/${siteSlug}` && !value.startsWith(`/${siteSlug}/`)) return fallback;
  return value;
}

export function isSafeCallbackUrl(value: string | null | undefined, siteSlug: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  return resolveSafeCallbackUrl(value, siteSlug) === value;
}
