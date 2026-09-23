import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import HomeForm from './HomeForm';

export const dynamic = 'force-dynamic';

export default async function SiteHomePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const home = await prisma.siteHome.findUnique({
    where: { siteId: context.site.id },
    include: { heroMedia: { select: { url: true } } },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - 首頁設定</h2>
      <p className="text-gray-500 mb-6">{context.site.description || '管理站點首頁的介紹與聯絡資訊。'}</p>
      <HomeForm
        siteSlug={siteSlug}
        initial={home ? { ...home, heroMediaUrl: home.heroMedia?.url ?? null } : null}
      />
    </div>
  );
}
