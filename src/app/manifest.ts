import type { MetadataRoute } from 'next';
import { PWA_ICONS } from '@/lib/pwa';

/** 管理平台本身的 manifest；各子網站前台另有 /{siteSlug}/manifest.webmanifest 覆蓋。 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '都更專案管理平台',
    short_name: '都更專案',
    description: '都更專案管理平台，整合公告、工程進度、公文、展覽與會議資訊。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#ffffff',
    icons: PWA_ICONS,
  };
}
