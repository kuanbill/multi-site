import { prisma } from './prisma';
import { getSiteBySlug } from './site';

// 與 src/proxy.ts 的 RESERVED 一致：這些第一層路徑不是子網站
const RESERVED_SEGMENTS = new Set(['login', 'register', 'api', 'sites', 'admin', 'users', '_next', 'favicon.ico']);

export type FrontendViewTarget = {
  siteSlug: string;
  featurePath: string;
  path: string;
};

/**
 * 解析前台功能頁路徑為追蹤目標。
 * 只認 /{siteSlug}/{featurePath}... 形式；admin、登入頁、全域路由與首頁皆不追蹤。
 * featurePath 是否為真實功能由 FeatureDefinition 決定（pages/posts 等 legacy 路徑自然被排除）。
 */
export function resolveFrontendView(pathname: string): FrontendViewTarget | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [siteSlug, featurePath] = parts;
  if (RESERVED_SEGMENTS.has(siteSlug)) return null;
  if (featurePath === 'admin' || featurePath === 'login' || featurePath === 'register') return null;
  return { siteSlug, featurePath, path: pathname };
}

/**
 * 寫入一筆瀏覽記錄。永遠不拋出例外，避免追蹤失敗影響頁面載入。
 */
export async function trackFrontendView(target: FrontendViewTarget, userId: number | null): Promise<void> {
  try {
    const site = await getSiteBySlug(target.siteSlug);
    if (!site || site.status === 'archived') return;
    const feature = await prisma.featureDefinition.findFirst({
      where: { path: target.featurePath },
      select: { key: true },
    });
    if (!feature) return;
    await prisma.featureView.create({
      data: {
        siteId: site.id,
        feature: feature.key,
        path: target.path,
        userId,
      },
    });
  } catch {
    // 瀏覽統計失敗不影響請求
  }
}
