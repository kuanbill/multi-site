import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import MapForm from './MapForm';
export const dynamic = 'force-dynamic';
export default async function MapsAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params; const context = await requireContentPermission(siteSlug, 'read');
  const items = await prisma.mapAsset.findMany({ where: { siteId: context.site.id }, include: { imageMedia: true, downloadMedia: true }, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] });
  const canWrite = canPerformContentAction(context.siteRole, 'write');
  return <section><h1 className="text-2xl font-bold mb-5">{context.site.name} - 地圖管理</h1>{canWrite && <MapForm siteSlug={siteSlug} />}
    <div className="mt-6 space-y-4">{items.map((item) => <article key={item.id} className="bg-white p-5 rounded shadow flex justify-between gap-4">
      <div>{item.imageMedia && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageMedia.url} alt={item.imageMedia.altText ?? item.title} className="max-h-48 max-w-full object-contain mb-3" />
      )}
        <h2 className="font-semibold">{item.title}</h2>{item.category && <p>{item.category}</p>}{item.description && <p className="text-gray-600">{item.description}</p>}
        {item.downloadMedia && <a className="text-blue-600 underline" href={item.downloadMedia.url} download>下載地圖檔案</a>}<p className="text-sm text-gray-500">{item.status}</p></div>
      {canWrite && <MapForm siteSlug={siteSlug} item={item} />}</article>)}</div>
  </section>;
}
