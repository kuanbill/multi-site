import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSiteBySlug = vi.hoisted(() => vi.fn())

vi.mock('@/lib/site', () => ({ getSiteBySlug }))
vi.mock('./EditSiteForm', () => ({
  default: ({ site }: { site: { id: number; slug: string } }) => (
    <div data-site-id={site.id} data-site-slug={site.slug} />
  ),
}))

import EditSitePage from './page'

describe('edit site page', () => {
  beforeEach(() => {
    getSiteBySlug.mockReset().mockResolvedValue({
      id: 7,
      name: '測試站點',
      slug: 'site-a',
      description: null,
    })
  })

  it('resolves the slug route to the site ID used by the edit form', async () => {
    const page = await EditSitePage({
      params: Promise.resolve({ siteSlug: 'site-a' }),
    })
    const html = renderToStaticMarkup(page)

    expect(getSiteBySlug).toHaveBeenCalledWith('site-a')
    expect(html).toContain('data-site-id="7"')
    expect(html).toContain('data-site-slug="site-a"')
  })
})
