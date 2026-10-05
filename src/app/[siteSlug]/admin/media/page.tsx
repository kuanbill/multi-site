import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import { findUsedMediaIds } from '@/lib/media';
import MediaLibrary from './MediaLibrary';

export const dynamic = 'force-dynamic';

export default async function MediaLibraryPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const canWrite = canPerformContentAction(context.siteRole, 'write');
  const canDelete = context.siteRole === 'global-admin' || context.siteRole === 'admin';

  const rows = await prisma.media.findMany({
    where: { siteId: context.site.id },
    orderBy: { createdAt: 'desc' },
  });
  const usedIds = await findUsedMediaIds(
    context.site.id,
    rows.map((row) => row.id),
  );
  const items = rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    url: row.url,
    type: row.type,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    altText: row.altText,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{context.site.name} - 媒體庫</h2>
        <p className="text-gray-500">
          管理本站的圖片與 PDF 檔案；所有檔案僅限本站使用，上傳時會自動以隨機檔名儲存，不會互相覆蓋。
        </p>
      </div>
      <MediaLibrary
        siteSlug={siteSlug}
        items={items}
        usedIds={[...usedIds]}
        canWrite={canWrite}
        canDelete={canDelete}
      />
    </div>
  );
}
