import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import SelectionForm from './SelectionForm';
export const dynamic = 'force-dynamic';
export default async function SelectionAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params; const context = await requireContentPermission(siteSlug, 'read');
  const selection = await prisma.selectionInfo.findUnique({ where: { siteId: context.site.id } });
  return <section><h1 className="text-2xl font-bold mb-5">{context.site.name} - 選屋資訊</h1>{canPerformContentAction(context.siteRole, 'write') ? <SelectionForm siteSlug={siteSlug} initial={selection} /> : <div className="bg-white p-6 rounded shadow"><p>{selection?.description ?? '尚無資訊'}</p></div>}</section>;
}
