import { describe, expect, it } from 'vitest';
import { buildSiteManifest, PWA_ICONS, siteShortName } from './pwa';

describe('buildSiteManifest', () => {
  it('scopes the app to the site with its own name and theme colour', () => {
    const manifest = buildSiteManifest({
      name: '中和都更案',
      slug: 'zhonghe-renewal',
      description: '中和都更案專屬網站',
      primaryColor: '#0f766e',
    });

    expect(manifest).toMatchObject({
      name: '中和都更案',
      start_url: '/zhonghe-renewal',
      scope: '/zhonghe-renewal',
      display: 'standalone',
      theme_color: '#0f766e',
      description: '中和都更案專屬網站',
    });
    expect(manifest.icons).toBe(PWA_ICONS);
  });

  it('falls back to a generated description when the site has none', () => {
    const manifest = buildSiteManifest({
      name: '板橋都更案',
      slug: 'banqiao-renewal',
      description: null,
      primaryColor: '#2563eb',
    });

    expect(manifest.description).toBe('板橋都更案 都更專案資訊');
  });

  it('keeps install icons covering 192, 512 and maskable', () => {
    expect(PWA_ICONS).toEqual([
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
  });
});

describe('siteShortName', () => {
  it('keeps short names untouched', () => {
    expect(siteShortName('中和都更案')).toBe('中和都更案');
  });

  it('truncates names that would be cut off by the launcher', () => {
    expect(siteShortName('板橋區都市更新案示範專案計畫')).toBe('板橋區都市更新案示範專…');
    expect(siteShortName('板橋區都市更新案示範專案計畫').length).toBeLessThanOrEqual(12);
  });
});
