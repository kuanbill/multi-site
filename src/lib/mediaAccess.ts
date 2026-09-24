import { prisma } from './prisma';

const ATTACHMENT_FEATURES = {
  announcement: 'announcements',
  progress: 'progress',
  exhibition: 'exhibitions',
  meeting: 'meetings',
  vendor: 'vendors',
  selection: 'selection',
  map: 'maps',
} as const;

type AttachmentOwner = keyof typeof ATTACHMENT_FEATURES;

export type MediaVisibility = { publicReference: boolean; memberReference: boolean };

export async function resolveMediaVisibility(siteId: number, mediaId: number): Promise<MediaVisibility> {
  const features = await prisma.siteFeature.findMany({
    where: { siteId, enabled: true },
    include: { feature: { select: { key: true } } },
  });
  const visibilityByFeature = new Map(features.map((item) => [item.feature.key, item.visibility]));
  const result: MediaVisibility = { publicReference: false, memberReference: false };
  const markFeature = (key: string) => {
    const visibility = visibilityByFeature.get(key);
    if (visibility === 'public') result.publicReference = true;
    if (visibility === 'members') result.memberReference = true;
  };

  const [home, vendorLogo, mapAsset, attachments, featureEntries] = await Promise.all([
    prisma.siteHome.findFirst({ where: { siteId, heroMediaId: mediaId }, select: { id: true } }),
    visibilityByFeature.has('vendors')
      ? prisma.vendor.findFirst({ where: { siteId, logoMediaId: mediaId, status: 'published' }, select: { id: true } })
      : Promise.resolve(null),
    visibilityByFeature.has('maps')
      ? prisma.mapAsset.findFirst({
          where: { siteId, status: 'published', OR: [{ imageMediaId: mediaId }, { downloadMediaId: mediaId }] },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.contentAttachment.findMany({
      where: { siteId, mediaId, ownerType: { in: Object.keys(ATTACHMENT_FEATURES) } },
      select: { ownerType: true, ownerId: true },
    }),
    prisma.featureEntry.findMany({
      where: { siteId, mediaId },
      include: { feature: { select: { key: true } } },
    }),
  ]);

  if (home) result.publicReference = true;
  if (vendorLogo) markFeature('vendors');
  if (mapAsset) markFeature('maps');
  for (const entry of featureEntries) markFeature(entry.feature.key);

  const ownerIds = new Map<AttachmentOwner, number[]>();
  for (const attachment of attachments) {
    const ownerType = attachment.ownerType as AttachmentOwner;
    const featureKey = ATTACHMENT_FEATURES[ownerType];
    if (!visibilityByFeature.has(featureKey)) continue;
    const ids = ownerIds.get(ownerType) ?? [];
    ids.push(attachment.ownerId);
    ownerIds.set(ownerType, ids);
  }

  const publishedChecks: Array<[AttachmentOwner, Promise<Array<{ id: number }>>]> = [
    ['announcement', prisma.announcement.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('announcement') ?? [] } }, select: { id: true } })],
    ['progress', prisma.progressItem.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('progress') ?? [] } }, select: { id: true } })],
    ['exhibition', prisma.exhibition.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('exhibition') ?? [] } }, select: { id: true } })],
    ['meeting', prisma.meetingRecord.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('meeting') ?? [] } }, select: { id: true } })],
    ['vendor', prisma.vendor.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('vendor') ?? [] } }, select: { id: true } })],
    ['selection', prisma.selectionInfo.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('selection') ?? [] } }, select: { id: true } })],
    ['map', prisma.mapAsset.findMany({ where: { siteId, status: 'published', id: { in: ownerIds.get('map') ?? [] } }, select: { id: true } })],
  ];
  const publishedOwners = await Promise.all(publishedChecks.map(([, query]) => query));
  for (let index = 0; index < publishedChecks.length; index++) {
    if (publishedOwners[index].length > 0) {
      markFeature(ATTACHMENT_FEATURES[publishedChecks[index][0]]);
    }
  }

  return result;
}
