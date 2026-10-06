import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { canManageSiteMembers, requireSiteContext } from '@/lib/contentAccess';
import {
  generateTempPassword,
  parseMemberRows,
  readMemberWorkbook,
  type ImportResult,
} from '@/lib/memberImport';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMPORT_ROLE = 'viewer';

export async function POST(req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const { site, siteRole } = await requireSiteContext(siteSlug);
  if (!canManageSiteMembers(siteRole)) {
    return NextResponse.json({ error: '僅本站管理員或編輯者可匯入成員' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: '請以上傳檔案方式送出' }, { status: 400 });

  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: '缺少檔案' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: '檔案是空的' }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: '檔案過大（上限 5MB）' }, { status: 400 });

  let rows;
  try {
    rows = await readMemberWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: '無法解析 Excel 檔，請使用「下載範本」取得的檔案填寫' }, { status: 400 });
  }

  const parsed = parseMemberRows(rows);
  if (parsed.headerError) return NextResponse.json({ error: parsed.headerError }, { status: 400 });
  if (parsed.entries.length === 0 && parsed.errors.length === 0) {
    return NextResponse.json({ error: '檔案中沒有資料列' }, { status: 400 });
  }

  const result: ImportResult = { created: [], skipped: [], errors: [...parsed.errors] };

  for (const entry of parsed.entries) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: entry.email } });
      if (existing) {
        const link = await prisma.siteUser.findUnique({
          where: { userId_siteId: { userId: existing.id, siteId: site.id } },
        });
        if (link) {
          result.skipped.push({ email: entry.email, reason: '已是本站成員' });
          continue;
        }
        const otherLinkCount = await prisma.siteUser.count({ where: { userId: existing.id } });
        const isGlobalAdmin = existing.role === 'admin' || existing.allSites === true;
        if (otherLinkCount >= 1 && !isGlobalAdmin) {
          result.errors.push({
            rowNumber: entry.rowNumber,
            email: entry.email,
            reason: '此帳號已屬於其他專案，站點獨立帳號不可重複加入',
          });
          continue;
        }
        await prisma.siteUser.create({ data: { userId: existing.id, siteId: site.id, role: IMPORT_ROLE } });
        result.created.push({
          email: entry.email,
          name: existing.name,
          phone: entry.phone,
          password: '',
          generated: false,
        });
        continue;
      }

      const password = generateTempPassword();
      const hashed = await hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email: entry.email,
          name: entry.name,
          phone: entry.phone || null,
          password: hashed,
          role: IMPORT_ROLE,
        },
      });
      await prisma.siteUser.create({ data: { userId: user.id, siteId: site.id, role: IMPORT_ROLE } });
      result.created.push({
        email: entry.email,
        name: entry.name,
        phone: entry.phone,
        password,
        generated: true,
      });
    } catch {
      result.errors.push({
        rowNumber: entry.rowNumber,
        email: entry.email,
        reason: '匯入失敗，請稍後重試',
      });
    }
  }

  return NextResponse.json(result);
}
