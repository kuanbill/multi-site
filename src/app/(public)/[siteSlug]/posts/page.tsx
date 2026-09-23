import { prisma } from '@/lib/prisma';
import { getSiteBySlug, isFeatureEnabled } from '@/lib/site';
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
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">公告</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">尚無公告</p>
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
