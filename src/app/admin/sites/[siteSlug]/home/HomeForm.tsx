'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediaPicker } from '@/components/admin';
import { buildHeroSaveHint, isHomeFormDirty, type HomeFormValues } from '@/lib/homeFormState';

type HomeValues = HomeFormValues;

const emptyHome: HomeValues = {
  tagline: '',
  intro: '',
  heroMediaId: null,
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
  const initialValues = useMemo<HomeValues>(
    () =>
      initial
        ? {
            tagline: initial.tagline ?? '',
            intro: initial.intro ?? '',
            heroMediaId: initial.heroMediaId,
            currentStage: initial.currentStage ?? '',
            contactName: initial.contactName ?? '',
            contactPhone: initial.contactPhone ?? '',
            contactEmail: initial.contactEmail ?? '',
            contactAddress: initial.contactAddress ?? '',
          }
        : emptyHome,
    [initial],
  );
  const [values, setValues] = useState<HomeValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const dirty = isHomeFormDirty(values, initialValues);
  const heroHint = buildHeroSaveHint({ heroMediaId: values.heroMediaId, dirty });

  // 上傳只寫入媒體池，未儲存就離開頁面會讓主圖看起來像上傳失敗。
  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

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
      <div className="space-y-2">
        <MediaPicker
          siteSlug={siteSlug}
          label="首頁主圖"
          accept="image"
          selectedIds={values.heroMediaId ? [values.heroMediaId] : []}
          onSelectionChange={(ids) =>
            setValues((current) => ({ ...current, heroMediaId: ids.length > 0 ? ids[0] : null }))
          }
          hint="建議使用寬幅橫向圖片，首頁會以滿版寬度顯示。"
        />
        <p
          className={`text-xs ${values.heroMediaId && dirty ? 'text-amber-700' : 'text-gray-500'}`}
          aria-live="polite"
        >
          {heroHint}
        </p>
        {values.heroMediaId && (
          <button
            type="button"
            onClick={() => setValues((current) => ({ ...current, heroMediaId: null }))}
            className="text-sm text-gray-600 hover:underline"
          >
            清除主圖
          </button>
        )}
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
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving || !dirty} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? '儲存中...' : '儲存首頁設定'}
        </button>
        {dirty && !saving && (
          <span className="text-sm text-amber-700">有尚未儲存的變更，儲存後才會顯示於前台。</span>
        )}
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
