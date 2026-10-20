import { notFound } from 'next/navigation';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import { readContentExternalLinks } from '@/lib/contentExternalLinks';
import SelectionForm from '../../SelectionForm';

export const dynamic = 'force-dynamic';

export default async function EditSelectionPage({ params }: { params: Promise<{ siteSlug: string; id: string }> }) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const item = await prisma.selectionInfo.findFirst({ where: { id, siteId: context.site.id } });
  if (!item) notFound();
  const [attachments, media, externalLinks] = await Promise.all([
    prisma.contentAttachment.findMany({
      where: { siteId: context.site.id, ownerType: 'selection', ownerId: id },
      include: { media: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.media.findMany({
      where: { siteId: context.site.id, type: { in: ['image', 'pdf'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, url: true, type: true, mimeType: true, sizeBytes: true, altText: true },
    }),
    readContentExternalLinks(prisma, { siteId: context.site.id, ownerType: 'selection', ownerId: id }),
  ]);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <a href={`/admin/sites/${siteSlug}/selection`} className="text-sm text-blue-700 underline">返回選配作業</a>
        <h1 className="mt-3 text-2xl font-bold">編輯選配作業</h1>
      </div>
      <SelectionForm
        siteSlug={siteSlug}
        initial={{ ...item, attachments, driveUrls: externalLinks.map((link) => link.url) }}
        media={media}
      />
    </section>
  );
}
