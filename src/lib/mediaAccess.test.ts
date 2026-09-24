import { beforeEach, describe, expect, it, vi } from 'vitest';

const siteFeatureFindMany = vi.hoisted(() => vi.fn());
const homeFindFirst = vi.hoisted(() => vi.fn());
const vendorFindFirst = vi.hoisted(() => vi.fn());
const mapFindFirst = vi.hoisted(() => vi.fn());
const attachmentFindMany = vi.hoisted(() => vi.fn());
const announcementFindMany = vi.hoisted(() => vi.fn());
const progressFindMany = vi.hoisted(() => vi.fn());
const exhibitionFindMany = vi.hoisted(() => vi.fn());
const meetingFindMany = vi.hoisted(() => vi.fn());
const vendorFindMany = vi.hoisted(() => vi.fn());
const selectionFindMany = vi.hoisted(() => vi.fn());
const mapFindMany = vi.hoisted(() => vi.fn());
const featureEntryFindMany = vi.hoisted(() => vi.fn());

vi.mock('./prisma', () => ({
  prisma: {
    siteFeature: { findMany: siteFeatureFindMany },
    siteHome: { findFirst: homeFindFirst },
    vendor: { findFirst: vendorFindFirst, findMany: vendorFindMany },
    mapAsset: { findFirst: mapFindFirst, findMany: mapFindMany },
    featureEntry: { findMany: featureEntryFindMany },
    contentAttachment: { findMany: attachmentFindMany },
    announcement: { findMany: announcementFindMany },
    progressItem: { findMany: progressFindMany },
    exhibition: { findMany: exhibitionFindMany },
    meetingRecord: { findMany: meetingFindMany },
    selectionInfo: { findMany: selectionFindMany },
  },
}));

import { resolveMediaVisibility } from './mediaAccess';

describe('media visibility', () => {
  beforeEach(() => {
    for (const query of [
      siteFeatureFindMany,
      homeFindFirst,
      vendorFindFirst,
      mapFindFirst,
      attachmentFindMany,
      announcementFindMany,
      progressFindMany,
      exhibitionFindMany,
      meetingFindMany,
      vendorFindMany,
      selectionFindMany,
      mapFindMany,
      featureEntryFindMany,
    ]) query.mockReset();

    siteFeatureFindMany.mockResolvedValue([
      { feature: { key: 'announcements' }, visibility: 'public' },
      { feature: { key: 'meetings' }, visibility: 'members' },
    ]);
    homeFindFirst.mockResolvedValue(null);
    vendorFindFirst.mockResolvedValue(null);
    mapFindFirst.mockResolvedValue(null);
    attachmentFindMany.mockResolvedValue([
      { ownerType: 'announcement', ownerId: 1 },
      { ownerType: 'meeting', ownerId: 2 },
    ]);
    announcementFindMany.mockResolvedValue([{ id: 1 }]);
    meetingFindMany.mockResolvedValue([{ id: 2 }]);
    for (const query of [progressFindMany, exhibitionFindMany, vendorFindMany, selectionFindMany, mapFindMany]) {
      query.mockResolvedValue([]);
    }
    featureEntryFindMany.mockResolvedValue([]);
  });

  it('requires member access when a shared asset has both public and member-only published references', async () => {
    await expect(resolveMediaVisibility(10, 42)).resolves.toEqual({
      publicReference: true,
      memberReference: true,
    });
  });

  it('does not expose an asset that has no published enabled-feature references', async () => {
    siteFeatureFindMany.mockResolvedValue([]);
    attachmentFindMany.mockResolvedValue([{ ownerType: 'announcement', ownerId: 1 }]);
    featureEntryFindMany.mockResolvedValue([{ feature: { key: 'announcements' } }]);
    homeFindFirst.mockResolvedValue(null);

    await expect(resolveMediaVisibility(10, 42)).resolves.toEqual({
      publicReference: false,
      memberReference: false,
    });
  });

  it('applies public feature visibility to a custom feature image', async () => {
    siteFeatureFindMany.mockResolvedValue([
      { feature: { key: 'project-info' }, visibility: 'public' },
    ]);
    featureEntryFindMany.mockResolvedValue([
      { feature: { key: 'project-info' } },
    ]);

    await expect(resolveMediaVisibility(10, 42)).resolves.toEqual({
      publicReference: true,
      memberReference: false,
    });
    expect(featureEntryFindMany).toHaveBeenCalledWith({
      where: { siteId: 10, mediaId: 42 },
      include: { feature: { select: { key: true } } },
    });
  });

  it('requires member access for an image referenced by a members-only custom feature', async () => {
    siteFeatureFindMany.mockResolvedValue([
      { feature: { key: 'project-info' }, visibility: 'members' },
    ]);
    featureEntryFindMany.mockResolvedValue([
      { feature: { key: 'project-info' } },
    ]);

    await expect(resolveMediaVisibility(10, 42)).resolves.toEqual({
      publicReference: false,
      memberReference: true,
    });
  });
});
