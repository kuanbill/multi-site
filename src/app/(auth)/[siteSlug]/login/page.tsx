import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import SiteLoginForm from '@/components/auth/SiteLoginForm';
import { authOptions } from '@/lib/auth';
import { getSiteBySlug } from '@/lib/site';
import { resolveSiteLoginState, resolveSiteLoginTarget } from '@/lib/siteLogin';

interface PageProps {
  params: Promise<{ siteSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SiteLoginPage({ params, searchParams }: PageProps) {
  const { siteSlug } = await params;
  const query = await searchParams;
  const pick = (key: string) => {
    const value = query[key];
    return typeof value === 'string' ? value : null;
  };

  const session = await getServerSession(authOptions);
  const state = resolveSiteLoginState({
    session,
    siteSlug,
    callbackUrl: pick('callbackUrl'),
    reason: pick('reason'),
    error: pick('error'),
  });

  // 已是本站成員：直接回導，不顯示登入表單
  if (state.mode === 'redirect-member') redirect(resolveSiteLoginTarget(state, siteSlug));

  const site = await getSiteBySlug(siteSlug);

  return (
    <SiteLoginForm
      siteSlug={siteSlug}
      siteName={site?.name ?? siteSlug}
      notice={state.notice}
      autoSignOut={state.mode === 'needs-signout'}
      targetUrl={resolveSiteLoginTarget(state, siteSlug)}
    />
  );
}
