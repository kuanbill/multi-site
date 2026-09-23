import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma';
import { validateAsset } from './contentValidation';

export async function saveMedia(siteId: number, file: File, altText?: string | null) {
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
        siteId,
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
