import type { MetadataRoute } from 'next';

/** 後台與各站前台共用的 PWA 圖示，由 scripts/generate-icons.mjs 產出到 public/icons。 */
export const PWA_ICONS: MetadataRoute.Manifest['icons'] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export type SiteManifestInput = {
  name: string;
  slug: string;
  description?: string | null;
  primaryColor: string;
};

const SHORT_NAME_LIMIT = 12;

/** 主畫面名稱過長會被系統截斷，先自行裁切。 */
export function siteShortName(name: string): string {
  return name.length > SHORT_NAME_LIMIT ? `${name.slice(0, SHORT_NAME_LIMIT - 1)}…` : name;
}

/** 子網站專屬 manifest：名稱、主色與範圍都限定在該站，安裝後不會跳出本站。 */
export function buildSiteManifest(site: SiteManifestInput): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: siteShortName(site.name),
    description: site.description || `${site.name} 都更專案資訊`,
    start_url: `/${site.slug}`,
    scope: `/${site.slug}`,
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: site.primaryColor,
    icons: PWA_ICONS,
  };
}
