import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import SelectionManager from './SelectionManager';

export const dynamic = 'force-dynamic';

export default async function SelectionAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const items = await prisma.selectionInfo.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const attachments = items.length
    ? await prisma.contentAttachment.findMany({
        where: { siteId: context.site.id, ownerType: 'selection', ownerId: { in: items.map((item) => item.id) } },
        include: { media: true },
        orderBy: { sortOrder: 'asc' },
      })
    : [];
  const externalLinks = items.length
    ? await prisma.contentExternalLink.findMany({
        where: { siteId: context.site.id, ownerType: 'selection', ownerId: { in: items.map((item) => item.id) } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      })
    : [];
  const attachmentByItem = new Map<number, typeof attachments>();
  for (const attachment of attachments) {
    const current = attachmentByItem.get(attachment.ownerId) ?? [];
    current.push(attachment);
    attachmentByItem.set(attachment.ownerId, current);
  }
  const rows = items.map((item) => ({ ...item, attachments: attachmentByItem.get(item.id) ?? [] }));
  const linksByItem = new Map<number, string[]>();
  for (const link of externalLinks) linksByItem.set(link.ownerId, [...(linksByItem.get(link.ownerId) ?? []), link.url]);
  const rowsWithLinks = rows.map((item) => ({ ...item, driveUrls: linksByItem.get(item.id) ?? [] }));

  return (
    <section>
      <p className="mb-4 text-sm text-gray-500">{context.site.name} / 後台</p>
      <SelectionManager
        siteSlug={siteSlug}
        items={rowsWithLinks}
        canWrite={canPerformContentAction(context.siteRole, 'write')}
        canDelete={canPerformContentAction(context.siteRole, 'delete')}
      />
    </section>
  );
}
