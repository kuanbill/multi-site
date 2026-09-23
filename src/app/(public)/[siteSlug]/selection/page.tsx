import { requirePublicFeature } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export default async function PublicSelectionPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params; const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'selection');
  const item = await prisma.selectionInfo.findFirst({ where: { siteId: site.id, ...publishedWhere } });
  if (!item) return <section className="bg-white p-8 rounded shadow"><h1 className="text-2xl font-bold">選屋資訊</h1><p className="mt-3 text-gray-500">目前尚無已發布資訊</p></section>;
  return <article className="bg-white p-8 rounded shadow space-y-4"><h1 className="text-2xl font-bold">{item.title}</h1>{item.applicableStage && <p><strong>適用階段：</strong>{item.applicableStage}</p>}{item.description && <p className="whitespace-pre-wrap">{item.description}</p>}{item.rules && <section><h2 className="font-semibold">選屋規則</h2><p className="whitespace-pre-wrap">{item.rules}</p></section>}{item.notice && <section><h2 className="font-semibold">注意事項</h2><p className="whitespace-pre-wrap">{item.notice}</p></section>}{item.deadline && <p>截止日期：{item.deadline.toLocaleString('zh-TW')}</p>}{item.externalUrl && <a className="text-blue-600 underline" href={item.externalUrl} target="_blank" rel="noreferrer">前往選屋連結</a>}</article>;
}
