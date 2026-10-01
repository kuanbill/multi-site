import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getSiteBySlug } from '@/lib/site';

export default async function SiteAuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  return (
    <div
      style={
        {
          '--site-primary': site.primaryColor,
          '--site-accent': site.accentColor,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
