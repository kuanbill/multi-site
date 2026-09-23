'use client';

import { useState } from 'react';
import type { SiteHome } from '@prisma/client';
import { useRouter } from 'next/navigation';

type HomeValues = Omit<SiteHome, 'id' | 'siteId' | 'updatedAt'> & { heroMediaUrl: string | null };

const emptyHome: HomeValues = {
  tagline: '',
  intro: '',
  heroMediaId: null,
  heroMediaUrl: '',
  currentStage: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
};

export default function HomeForm({
  siteSlug,
  initial,
}: {
  siteSlug: string;
  initial: (HomeValues & { id: number; siteId: number; updatedAt: Date }) | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<HomeValues>(() =>
    initial
      ? {
          tagline: initial.tagline ?? '',
          intro: initial.intro ?? '',
          heroMediaId: initial.heroMediaId,
          heroMediaUrl: initial.heroMediaUrl ?? '',
          currentStage: initial.currentStage ?? '',
          contactName: initial.contactName ?? '',
          contactPhone: initial.contactPhone ?? '',
          contactEmail: initial.contactEmail ?? '',
          contactAddress: initial.contactAddress ?? '',
        }
      : emptyHome,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof HomeValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/${siteSlug}/admin/home`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          heroMediaId: values.heroMediaId || null,
          heroMediaUrl: values.heroMediaUrl || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || '儲存失敗');
        return;
      }
      setMessage('已儲存');
      router.refresh();
    } catch {
      setMessage('無法連線至伺服器');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          首頁標語
          <input value={values.tagline ?? ''} onChange={(event) => update('tagline', event.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-lg" />
        </label>
        <label className="block text-sm font-medium">
          目前階段
          <input value={values.currentStage ?? ''} onChange={(event) => update('currentStage', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
        </label>
      </div>
      <label className="block text-sm font-medium">
        專案簡介
        <textarea value={values.intro ?? ''} onChange={(event) => update('intro', event.target.value)} rows={5} className="mt-1 w-full px-3 py-2 border rounded-lg" />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          主圖 Media ID
          <input type="number" min="1" value={values.heroMediaId ?? ''} onChange={(event) => setValues((current) => ({ ...current, heroMediaId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 w-full px-3 py-2 border rounded-lg" />
        </label>
        <label className="block text-sm font-medium">
          主圖 URL
          <input value={values.heroMediaUrl ?? ''} onChange={(event) => update('heroMediaUrl', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
        </label>
      </div>
      <div className="border-t pt-6">
        <h3 className="font-medium mb-4">聯絡資訊</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            聯絡人
            <input value={values.contactName ?? ''} onChange={(event) => update('contactName', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="block text-sm font-medium">
            聯絡電話
            <input value={values.contactPhone ?? ''} onChange={(event) => update('contactPhone', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="block text-sm font-medium">
            聯絡電子郵件
            <input type="email" value={values.contactEmail ?? ''} onChange={(event) => update('contactEmail', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="block text-sm font-medium">
            聯絡地址
            <input value={values.contactAddress ?? ''} onChange={(event) => update('contactAddress', event.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? '儲存中...' : '儲存首頁設定'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
