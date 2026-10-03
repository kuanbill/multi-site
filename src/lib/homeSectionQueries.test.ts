import { describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    featureEntry: { findMany: vi.fn() },
    announcement: { findMany: vi.fn() },
    progressItem: { findMany: vi.fn() },
    page: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { loadSectionRows } from './homeSectionQueries';

const SITE_ID = 7;

describe('loadSectionRows', () => {
  it('returns an empty list when a feature section has no feature', async () => {
    expect(await loadSectionRows(SITE_ID, 'feature', null, { filter: 'all', limit: 3 })).toEqual([]);
    expect(prisma.featureEntry.findMany).not.toHaveBeenCalled();
  });

  it('queries published announcements with the section limit', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);

    await loadSectionRows(SITE_ID, 'announcement', null, { filter: 'all', limit: 3 });

    expect(prisma.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' }),
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 3,
      }),
    );
  });

  it('restricts progress to the current stage when asked', async () => {
    prisma.progressItem.findMany.mockResolvedValue([]);

    await loadSectionRows(SITE_ID, 'progress', null, { filter: 'current', limit: 1 });

    expect(prisma.progressItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published', progressStatus: 'current' }),
        take: 1,
      }),
    );
  });

  it('takes all published progress for an unknown filter', async () => {
    prisma.progressItem.findMany.mockResolvedValue([]);

    await loadSectionRows(SITE_ID, 'progress', null, { filter: 'bogus', limit: 12 });

    expect(prisma.progressItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: SITE_ID, status: 'published' },
        take: 12,
      }),
    );
  });

  it('takes the feature entry limit and its image', async () => {
    prisma.featureEntry.findMany.mockResolvedValue([]);

    await loadSectionRows(SITE_ID, 'feature', 5, { filter: 'all', limit: 6 });

    expect(prisma.featureEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: SITE_ID, featureId: 5 },
        include: { media: { select: { url: true, altText: true } } },
        take: 6,
      }),
    );
  });

  it('queries pages in creation order', async () => {
    prisma.page.findMany.mockResolvedValue([]);

    await loadSectionRows(SITE_ID, 'page', null, { filter: 'all', limit: 12 });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: SITE_ID }, orderBy: { createdAt: 'asc' }, take: 12 }),
    );
  });
});