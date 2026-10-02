'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  siteSlug: string;
  siteName: string;
  notice: string | null;
  autoSignOut: boolean;
  targetUrl: string;
}

export default function SiteLoginForm({ siteSlug, siteName, notice, autoSignOut, targetUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutStarted = useRef(false);

  useEffect(() => {
    if (!autoSignOut || signOutStarted.current) return;
    signOutStarted.current = true;
    setSigningOut(true);
    // 非本站成員的 session 不予承認：先登出，再回到帶參數的登入頁重新驗證
    void signOut({ callbackUrl: window.location.pathname + window.location.search });
  }, [autoSignOut]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const result = await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      siteSlug,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(targetUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-2">專案登入</h1>
        <p className="text-center text-sm text-gray-500 mb-6">{siteName}</p>

        {notice && (
          <div className="mb-4 p-3 bg-amber-100 text-amber-800 rounded text-sm">{notice}</div>
        )}
        {autoSignOut && signingOut && (
          <div className="mb-4 p-3 bg-gray-100 text-gray-600 rounded text-sm">正在登出目前帳號...</div>
        )}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">電子郵件</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">密碼</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || signingOut}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href={`/${siteSlug}`} className="text-primary hover:underline">
            返回專案首頁
          </Link>
          <span className="mx-2 text-gray-300">|</span>
          <Link href="/login" className="text-primary hover:underline">
            全域管理員登入
          </Link>
        </p>
      </div>
    </div>
  );
}
