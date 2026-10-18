import { notFound } from 'next/navigation';
import { requireSiteAccess } from '@/lib/siteAuth';
import { getSiteBySlug, getEnabledFeatures } from '@/lib/site';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default async function SiteAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const session = await requireSiteAccess(siteSlug);
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  const features = await getEnabledFeatures(site.id);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar siteSlug={siteSlug} features={features} siteName={site.name} />
      <div className="ml-64">
        {session && <Header user={session.user} siteName={site.name} />}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
