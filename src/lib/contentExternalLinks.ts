const GOOGLE_DRIVE_HOSTS = new Set(['drive.google.com', 'www.drive.google.com']);

export const GOOGLE_DRIVE_LINK_ERROR = 'Google Drive 連結格式無效';

type ContentExternalLinkWhere = {
  siteId: number;
  ownerType: string;
  ownerId: number;
};

type ContentExternalLinkClient = {
  contentExternalLink: {
    deleteMany(args: { where: ContentExternalLinkWhere }): Promise<unknown>;
    createMany(args: {
      data: Array<ContentExternalLinkWhere & { url: string; sortOrder: number }>;
    }): Promise<unknown>;
    findMany(args: {
      where: ContentExternalLinkWhere;
      orderBy: Array<{ sortOrder: 'asc' | 'desc' } | { id: 'asc' | 'desc' }>;
      select: { id: true; url: true; sortOrder: true };
    }): Promise<ContentExternalLinkRecord[]>;
  };
};

export type ContentExternalLinkRecord = {
  id: number;
  url: string;
  sortOrder: number;
};

function isGoogleDriveUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GOOGLE_DRIVE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseGoogleDriveUrls(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(GOOGLE_DRIVE_LINK_ERROR);

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') throw new Error(GOOGLE_DRIVE_LINK_ERROR);
    const url = item.trim();
    if (!url) continue;
    if (!isGoogleDriveUrl(url) || seen.has(url)) {
      if (!isGoogleDriveUrl(url)) throw new Error(GOOGLE_DRIVE_LINK_ERROR);
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export async function syncContentExternalLinks(
  tx: ContentExternalLinkClient,
  input: ContentExternalLinkWhere & { urls: string[] },
): Promise<void> {
  const { urls, ...where } = input;
  await tx.contentExternalLink.deleteMany({ where });
  if (urls.length === 0) return;

  await tx.contentExternalLink.createMany({
    data: urls.map((url, sortOrder) => ({ ...where, url, sortOrder })),
  });
}

export function readContentExternalLinks(
  client: ContentExternalLinkClient,
  where: ContentExternalLinkWhere,
): Promise<ContentExternalLinkRecord[]> {
  return client.contentExternalLink.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, url: true, sortOrder: true },
  });
}
