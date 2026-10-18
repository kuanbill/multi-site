import { notFound } from 'next/navigation';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import ProgressForm from '../../ProgressForm';

export const dynamic = 'force-dynamic';

export default async function EditProgressPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId < 1) notFound();

  const item = await prisma.progressItem.findFirst({
    where: { id: itemId, siteId: context.site.id },
  });
  if (!item) notFound();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - 編輯進度</h2>
      <p className="text-gray-500 mb-6">更新階段資訊與發布狀態。</p>
      <ProgressForm siteSlug={siteSlug} initial={item} />
    </div>
  );
}
