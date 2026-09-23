import { notFound } from 'next/navigation';
import { getSiteBySlug, getEnabledFeatures } from '@/lib/site';
import SiteHeader from '@/components/public/SiteHeader';

export async function generateMetadata({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) return {};
  return { title: site.name + ' | 都更專案', description: site.description || '' };
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  if (site.status === 'archived') notFound();
  const features = await getEnabledFeatures(site.id);
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader siteSlug={siteSlug} siteName={site.name} features={features} />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
