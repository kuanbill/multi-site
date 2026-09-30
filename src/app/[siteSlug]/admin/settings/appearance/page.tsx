import { canManageSiteSettings, requireSiteContext } from '@/lib/contentAccess';
import AppearanceClient from './AppearanceClient';

export const dynamic = 'force-dynamic';

export default async function SiteAppearancePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireSiteContext(siteSlug);
  const site = context.site;
  const canManageSettings = canManageSiteSettings(context.siteRole);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 外觀設定</h2>
      <p className="text-gray-500 mb-6">
        設定前台頁首、按鈕與連結使用的主色與輔色。僅站點管理員可修改設定。
      </p>
      <AppearanceClient
        siteSlug={siteSlug}
        initial={{ primaryColor: site.primaryColor, accentColor: site.accentColor }}
        canManageSettings={canManageSettings}
      />
    </div>
  );
}
