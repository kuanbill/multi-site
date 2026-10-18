import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import SelectionForm from '../SelectionForm';

export const dynamic = 'force-dynamic';

export default async function NewSelectionPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const media = await prisma.media.findMany({
    where: { siteId: context.site.id, type: { in: ['image', 'pdf'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, url: true, type: true, mimeType: true, sizeBytes: true, altText: true },
  });

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <a href={`/admin/sites/${siteSlug}/selection`} className="text-sm text-blue-700 underline">返回選配作業</a>
        <h1 className="mt-3 text-2xl font-bold">新增選配作業</h1>
      </div>
      <SelectionForm siteSlug={siteSlug} initial={null} media={media} />
    </section>
  );
}
