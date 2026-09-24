import { notFound } from 'next/navigation';
import { getEnabledFeatureByPath, getSiteBySlug } from '@/lib/site';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function CustomFeaturePage({
  params,
}: {
  params: Promise<{ siteSlug: string; featurePath: string[] }>;
}) {
  const { siteSlug, featurePath } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') notFound();

  const path = featurePath.join('/');
  const siteFeature = await getEnabledFeatureByPath(site.id, path);
  if (!siteFeature) notFound();

  const { feature } = await requirePublicFeature(siteSlug, siteFeature.feature.key);

  return (
    <article className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">{feature.feature.label}</h1>
      {feature.feature.description && (
        <p className="text-gray-700 whitespace-pre-wrap">{feature.feature.description}</p>
      )}
    </article>
  );
}
