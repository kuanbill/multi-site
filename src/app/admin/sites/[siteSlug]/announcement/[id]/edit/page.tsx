import { notFound } from 'next/navigation';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import AnnouncementForm from '../../AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const announcementId = Number(id);
  if (!Number.isInteger(announcementId) || announcementId < 1) notFound();

  const item = await prisma.announcement.findFirst({
    where: { id: announcementId, siteId: context.site.id },
  });
  if (!item) notFound();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - 編輯公告</h2>
      <p className="text-gray-500 mb-6">更新公告內容與發布狀態。</p>
      <AnnouncementForm siteSlug={siteSlug} initial={item} />
    </div>
  );
}
