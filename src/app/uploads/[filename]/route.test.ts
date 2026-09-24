import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readFile, getServerSession, resolveMediaVisibility, mediaFindFirst, siteUserFindFirst } = vi.hoisted(() => ({
  readFile: vi.fn(),
  getServerSession: vi.fn(),
  resolveMediaVisibility: vi.fn(),
  mediaFindFirst: vi.fn(),
  siteUserFindFirst: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ readFile }));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/mediaAccess', () => ({ resolveMediaVisibility }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: { media: { findFirst: mediaFindFirst }, siteUser: { findFirst: siteUserFindFirst } } }));

import { GET } from './route';

describe('uploaded feature media route', () => {
  beforeEach(() => {
    readFile.mockReset().mockResolvedValue(Buffer.from('image-bytes'));
    getServerSession.mockReset().mockResolvedValue(null);
    resolveMediaVisibility.mockReset().mockResolvedValue({ publicReference: false, memberReference: true });
    mediaFindFirst.mockReset().mockResolvedValue({
      id: 44,
      siteId: 7,
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      site: { slug: 'site-a', status: 'active' },
    });
    siteUserFindFirst.mockReset().mockResolvedValue(null);
  });

  it('redirects anonymous users away from an image referenced by a members-only feature', async () => {
    const response = await GET(new Request('https://example.test/uploads/image.jpg'), {
      params: Promise.resolve({ filename: 'image.jpg' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.test/site-a/login');
    expect(readFile).not.toHaveBeenCalled();
  });

  it('returns the image to a member when the members-only feature references it', async () => {
    getServerSession.mockResolvedValue({ user: { id: '12', role: 'editor' } });
    siteUserFindFirst.mockResolvedValue({ id: 2 });

    const response = await GET(new Request('https://example.test/uploads/image.jpg'), {
      params: Promise.resolve({ filename: 'image.jpg' }),
    });

    expect(response.status).toBe(200);
    expect(resolveMediaVisibility).toHaveBeenCalledWith(7, 44);
    expect(await response.arrayBuffer()).toEqual(Uint8Array.from(Buffer.from('image-bytes')).buffer);
  });
});
