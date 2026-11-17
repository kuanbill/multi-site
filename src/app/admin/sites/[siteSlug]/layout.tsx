import { notFound } from 'next/navigation';
import { requireSiteAccess } from '@/lib/siteAuth';
import { getSiteBySlug, getEnabledFeatures } from '@/lib/site';
import AdminShell from '@/components/AdminShell';

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
    <AdminShell
      user={session.user}
      siteSlug={siteSlug}
      siteName={site.name}
      features={features}
    >
      {children}
    </AdminShell>
  );
}
