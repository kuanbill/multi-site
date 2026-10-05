import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('root manifest', () => {
  const value = manifest();

  it('is installable as a standalone app', () => {
    expect(value).toMatchObject({
      name: '都更專案管理平台',
      short_name: '都更專案',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
  });

  it('declares 192, 512 and maskable icons', () => {
    expect(value.icons).toEqual([
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
  });
});
