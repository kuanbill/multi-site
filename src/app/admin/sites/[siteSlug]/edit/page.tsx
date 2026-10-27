import { notFound } from 'next/navigation'
import { getSiteBySlug } from '@/lib/site'
import EditSiteForm from './EditSiteForm'

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>
}) {
  const { siteSlug } = await params
  const site = await getSiteBySlug(siteSlug)

  if (!site) notFound()

  return (
    <EditSiteForm
      site={{
        id: site.id,
        name: site.name,
        slug: site.slug,
        description: site.description ?? '',
      }}
    />
  )
}
