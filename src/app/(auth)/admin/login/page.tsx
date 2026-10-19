'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminSessionProvider from '@/components/auth/AdminSessionProvider';

export default function AdminLoginPage() {
  return (
    <AdminSessionProvider>
      <AdminLoginForm />
    </AdminSessionProvider>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      callbackUrl: '/admin',
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="都更後台" className="mx-auto mb-4 h-24 w-24 rounded-2xl object-contain" />
        <h1 className="text-2xl font-bold text-center mb-2">都更案件後台管理登入</h1>
        <p className="text-center text-sm text-gray-500 mb-6">僅限全域管理員使用</p>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="admin-email">電子郵件</label>
            <input id="admin-email" name="email" type="email" required className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="admin-password">密碼</label>
            <input id="admin-password" name="password" type="password" required className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {loading ? '登入中...' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  );
}
