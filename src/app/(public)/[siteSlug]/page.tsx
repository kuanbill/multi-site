import { prisma } from '@/lib/prisma';
import { getSiteBySlug } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const posts = await prisma.post.findMany({
    where: { siteId: site.id, published: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  const pages = await prisma.page.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-3xl font-bold mb-2">{site.name}</h1>
        <p className="text-gray-600">{site.description}</p>
      </div>

      {pages.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-bold mb-4">頁面</h2>
          <ul className="space-y-2">
            {pages.map((p) => (
              <li key={p.id}>
                <Link href={`/${siteSlug}/pages/${p.slug}`} className="text-blue-600 hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-bold mb-4">最新公告</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">尚無公告</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="border-b pb-4 last:border-0">
                <Link href={`/${siteSlug}/posts/${post.slug}`} className="font-medium text-blue-600 hover:underline">
                  {post.title}
                </Link>
                <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleDateString('zh-TW')}</p>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/${siteSlug}/posts`} className="inline-block mt-4 text-sm text-blue-600 hover:underline">
          查看全部文章 →
        </Link>
      </div>
    </div>
  );
}
