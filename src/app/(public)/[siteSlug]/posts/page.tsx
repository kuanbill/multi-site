import { prisma } from '@/lib/prisma';
import { getSiteBySlug, isFeatureEnabled, getFeatureDisplayMode } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicPostsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  if (!(await isFeatureEnabled(site.id, 'posts'))) notFound();
  const posts = await prisma.post.findMany({
    where: { siteId: site.id, published: true },
    orderBy: { createdAt: 'desc' },
  });
  const displayMode = await getFeatureDisplayMode(site.id, 'posts');
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">公告</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">尚無公告</p>
      ) : displayMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((p) => (
            <Link key={p.id} href={`/${siteSlug}/posts/${p.slug}`} className="block border rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-medium text-blue-600 mb-1">{p.title}</h3>
              <p className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString('zh-TW')}</p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.content?.replace(/<[^>]*>/g, '').slice(0, 80) || ''}</p>
            </Link>
          ))}
        </div>
      ) : displayMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {posts.map((p) => (
            <Link key={p.id} href={`/${siteSlug}/posts/${p.slug}`} className="border rounded-lg p-3 text-center hover:shadow">
              <p className="font-medium text-blue-600">{p.title}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(p.createdAt).toLocaleDateString('zh-TW')}</p>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id} className="border-b pb-4">
              <Link href={`/${siteSlug}/posts/${p.slug}`} className="font-medium text-blue-600 hover:underline">
                {p.title}
              </Link>
              <p className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString('zh-TW')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
