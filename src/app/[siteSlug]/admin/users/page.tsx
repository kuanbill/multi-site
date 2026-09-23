import { prisma } from '@/lib/prisma';
import { requireSiteAccess } from '@/lib/siteAuth';
import { getSiteBySlug } from '@/lib/site';
import { notFound } from 'next/navigation';
import SiteUsersClient from './SiteUsersClient';

export const dynamic = 'force-dynamic';

export default async function SiteUsersPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  await requireSiteAccess(siteSlug);
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  const members = await prisma.siteUser.findMany({
    where: { siteId: site.id },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const list = members.map((m) => ({
    siteRole: m.role,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    createdAt: m.user.createdAt.toISOString(),
  }));
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 成員管理</h2>
      <p className="text-gray-500 mb-6">站點獨立帳號，一人一站（管理員除外）</p>
      <SiteUsersClient siteSlug={siteSlug} initial={list} />
    </div>
  );
}
