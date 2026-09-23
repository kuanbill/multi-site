'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Announcement } from '@prisma/client';

type AnnouncementFormValues = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  pinned: boolean;
  status: string;
  sortOrder: string;
};

type Props = {
  siteSlug: string;
  initial: Announcement | null;
};

export default function AnnouncementForm({ siteSlug, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<AnnouncementFormValues>(() => ({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    summary: initial?.summary ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? '',
    pinned: initial?.pinned ?? false,
    status: initial?.status ?? 'draft',
    sortOrder: initial ? String(initial.sortOrder) : '0',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof AnnouncementFormValues, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value } as AnnouncementFormValues));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        title: values.title,
        slug: values.slug,
        summary: values.summary || null,
        content: values.content || null,
        category: values.category || null,
        pinned: values.pinned,
        status: values.status,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
      };
      const url = initial
        ? `/api/${siteSlug}/admin/announcement/${initial.id}`
        : `/api/${siteSlug}/admin/announcement`;
      const method = initial ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || '儲存失敗');
        return;
      }
      setMessage('已儲存');
      router.push(`/${siteSlug}/admin/announcement`);
      router.refresh();
    } catch {
      setMessage('無法連線至伺服器');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          標題
          <input
            value={values.title}
            onChange={(event) => update('title', event.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          識別碼（slug）
          <input
            value={values.slug}
            onChange={(event) => update('slug', event.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
          <span className="text-xs text-gray-400">僅小寫英文、數字與連字號</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          分類
          <input
            value={values.category}
            onChange={(event) => update('category', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          排序
          <input
            type="number"
            value={values.sortOrder}
            onChange={(event) => update('sortOrder', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        摘要
        <textarea
          value={values.summary}
          onChange={(event) => update('summary', event.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <label className="block text-sm font-medium">
        內容
        <textarea
          value={values.content}
          onChange={(event) => update('content', event.target.value)}
          rows={6}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.pinned}
            onChange={(event) => update('pinned', event.target.checked)}
          />
          置頂
        </label>
        <label className="block text-sm font-medium">
          狀態
          <select
            value={values.status}
            onChange={(event) => update('status', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          >
            <option value="draft">草稿</option>
            <option value="published">已發布</option>
            <option value="archived">封存</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : initial ? '更新公告' : '建立公告'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${siteSlug}/admin/announcement`)}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          返回列表
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
