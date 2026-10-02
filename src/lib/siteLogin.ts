import type { Session } from 'next-auth';
import { isSafeCallbackUrl } from './callbackUrl';

export type SiteLoginMode = 'redirect-member' | 'needs-signout' | 'form';

export type SiteLoginState = {
  mode: SiteLoginMode;
  notice: string | null;
  safeCallbackUrl: string | null;
};

export const MEMBERS_ONLY_NOTICE = '此功能僅限本站成員瀏覽，請先登入後繼續。';
export const NOT_MEMBER_NOTICE = '目前帳號不屬於本站，請以本站成員帳號重新登入。';

export function isSiteMember(session: Session | null, siteSlug: string): boolean {
  if (!session) return false;
  if (session.user.role === 'admin') return true;
  return Boolean(session.user.siteRoles?.some((role) => role.slug === siteSlug));
}

/**
 * 決定站點登入頁的呈現方式：
 * - `redirect-member`：已是本站成員（或全域管理員），直接回導，不顯示表單。
 * - `needs-signout`：帶著非本站的 session，畫面顯示提示並自動登出。
 * - `form`：未登入（或剛登出），顯示登入表單。
 */
export function resolveSiteLoginState(input: {
  session: Session | null;
  siteSlug: string;
  callbackUrl: string | null;
  reason: string | null;
  error: string | null;
}): SiteLoginState {
  const safeCallbackUrl = isSafeCallbackUrl(input.callbackUrl, input.siteSlug)
    ? (input.callbackUrl as string)
    : null;

  if (input.session) {
    if (isSiteMember(input.session, input.siteSlug)) {
      return { mode: 'redirect-member', notice: null, safeCallbackUrl };
    }
    return { mode: 'needs-signout', notice: NOT_MEMBER_NOTICE, safeCallbackUrl };
  }

  let notice: string | null = null;
  if (input.error === 'not-member') {
    notice = NOT_MEMBER_NOTICE;
  } else if (input.reason === 'members-only') {
    notice = MEMBERS_ONLY_NOTICE;
  }
  return { mode: 'form', notice, safeCallbackUrl };
}

/** 登入成功後的導向目標：安全的 callbackUrl，否則退回站點後台。 */
export function resolveSiteLoginTarget(state: SiteLoginState, siteSlug: string): string {
  return state.safeCallbackUrl ?? `/${siteSlug}/admin`;
}
