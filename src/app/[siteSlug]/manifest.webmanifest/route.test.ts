import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSiteBySlug } = vi.hoisted(() => ({ getSiteBySlug: vi.fn() }));

vi.mock('@/lib/site', () => ({ getSiteBySlug }));

import { GET } from './route';

describe('site web manifest route', () => {
  beforeEach(() => {
    getSiteBySlug.mockReset();
  });

  const request = new Request('https://example.test/zhonghe-renewal/manifest.webmanifest');
  const context = { params: Promise.resolve({ siteSlug: 'zhonghe-renewal' }) };

  it('returns 404 for an unknown site', async () => {
    const response = await GET(request, context);

    expect(response.status).toBe(404);
  });

  it('returns 404 for an archived site', async () => {
    getSiteBySlug.mockResolvedValue({ id: 1, slug: 'old-site', status: 'archived' });

    const response = await GET(request, context);

    expect(response.status).toBe(404);
  });

  it('serves a manifest scoped to the site with its own name and colour', async () => {
    getSiteBySlug.mockResolvedValue({
      id: 1,
      name: '中和都更案',
      slug: 'zhonghe-renewal',
      description: null,
      status: 'active',
      primaryColor: '#0f766e',
    });

    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/manifest+json; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(await response.json()).toMatchObject({
      name: '中和都更案',
      start_url: '/zhonghe-renewal',
      scope: '/zhonghe-renewal',
      theme_color: '#0f766e',
      display: 'standalone',
    });
  });
});
