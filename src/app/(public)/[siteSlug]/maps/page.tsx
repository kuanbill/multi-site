import { requirePublicFeature } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export default async function PublicMapsPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params; const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'maps');
  const maps = await prisma.mapAsset.findMany({ where: { siteId: site.id, ...publishedWhere }, include: { imageMedia: true, downloadMedia: true }, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] });
  return <section><header className="bg-white p-8 rounded shadow mb-6"><h1 className="text-2xl font-bold">{site.name} - 地圖資訊</h1></header>{maps.length === 0 ? <p className="bg-white p-6 rounded shadow text-gray-500">尚無已發布地圖</p> : <div className="grid gap-6 md:grid-cols-2">{maps.map((map) => <article key={map.id} className="bg-white p-5 rounded shadow">{map.imageMedia && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={map.imageMedia.url} alt={map.imageMedia.altText ?? map.title} className="w-full max-h-96 object-contain" />
  )}<h2 className="mt-3 font-bold">{map.title}</h2>{map.category && <p className="text-sm text-gray-500">{map.category}</p>}{map.description && <p className="mt-2 whitespace-pre-wrap">{map.description}</p>}{map.downloadMedia && <a className="inline-block mt-3 text-blue-600 underline" href={`/api/${siteSlug}/maps/${map.id}/download`}>下載{map.downloadMedia.type === 'pdf' ? ' PDF' : '地圖檔案'}</a>}</article>)}</div>}</section>;
}
