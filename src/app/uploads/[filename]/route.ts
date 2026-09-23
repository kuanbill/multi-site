import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename: raw } = await params; const filename = path.basename(raw);
  const media = await prisma.media.findFirst({ where: { filename } });
  if (!media) return new NextResponse('Not found', { status: 404 });
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  try {
    const body = await readFile(path.join(uploadDir, filename));
    return new NextResponse(body, { headers: { 'Content-Type': media.mimeType ?? 'application/octet-stream', 'Content-Length': String(body.byteLength), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600' } });
  } catch { return new NextResponse('Not found', { status: 404 }); }
}
