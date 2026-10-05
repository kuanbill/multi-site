import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SiteContext } from './contentAccess';
import { prisma } from './prisma';
import { validateAsset } from './contentValidation';

export async function saveMedia(context: SiteContext, file: File, altText?: string | null) {
  const { extension, mimeType } = validateAsset(file);
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  const filename = `${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDir, filename);
  const contents = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, contents, { flag: 'wx' });

  try {
    return await prisma.media.create({
      data: {
        siteId: context.site.id,
        filename,
        url: `/uploads/${filename}`,
        type: mimeType === 'application/pdf' ? 'pdf' : 'image',
        mimeType,
        sizeBytes: contents.byteLength,
        altText: altText?.trim() || null,
      },
    });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
}

export async function findUsedMediaIds(siteId: number, mediaIds: number[]): Promise<Set<number>> {
  const ids = [...new Set(mediaIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return new Set();

  const rows = await prisma.media.findMany({
    where: { siteId, id: { in: ids } },
    select: {
      id: true,
      attachments: { select: { id: true }, take: 1 },
      homeHero: { select: { id: true }, take: 1 },
      vendorLogos: { select: { id: true }, take: 1 },
      mapImages: { select: { id: true }, take: 1 },
      mapDownloads: { select: { id: true }, take: 1 },
      featureEntryImages: { select: { id: true }, take: 1 },
    },
  });

  const used = new Set<number>();
  for (const row of rows) {
    const referenced =
      row.attachments.length > 0 ||
      row.homeHero.length > 0 ||
      row.vendorLogos.length > 0 ||
      row.mapImages.length > 0 ||
      row.mapDownloads.length > 0 ||
      row.featureEntryImages.length > 0;
    if (referenced) used.add(row.id);
  }
  return used;
}
