import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { saveMedia } from '@/lib/media';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: '表單格式錯誤' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: '請選擇檔案' }, { status: 400 });
  const altText = form.get('altText');
  const label = form.get('label');
  if (altText !== null && typeof altText !== 'string') return NextResponse.json({ error: '替代文字格式錯誤' }, { status: 400 });
  if (label !== null && typeof label !== 'string') return NextResponse.json({ error: '標籤格式錯誤' }, { status: 400 });
  try {
    const media = await saveMedia(context, file, typeof altText === 'string' ? altText : null);
    return NextResponse.json({ id: media.id, url: media.url, label: typeof label === 'string' ? label.trim() || null : null }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '上傳失敗' }, { status: 400 });
  }
}
