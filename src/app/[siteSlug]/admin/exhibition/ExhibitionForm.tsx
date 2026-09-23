'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Exhibition } from '@prisma/client';

type ExhibitionFormValues = {
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  feedbackSummary: string;
  status: string;
  sortOrder: string;
  attachmentIds: string;
};

type Props = {
  siteSlug: string;
  initial: Exhibition | null;
  onSuccess?: () => void;
};

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function ExhibitionForm({ siteSlug, initial, onSuccess }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ExhibitionFormValues>(() => ({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    startDate: toDateInput(initial?.startDate),
    endDate: toDateInput(initial?.endDate),
    location: initial?.location ?? '',
    description: initial?.description ?? '',
    feedbackSummary: initial?.feedbackSummary ?? '',
    status: initial?.status ?? 'draft',
    sortOrder: initial ? String(initial.sortOrder) : '0',
    attachmentIds: '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof ExhibitionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const attachmentIds = values.attachmentIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0);

      const payload: Record<string, unknown> = {
        title: values.title,
        slug: values.slug,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        location: values.location || null,
        description: values.description || null,
        feedbackSummary: values.feedbackSummary || null,
        status: values.status,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
      };
      if (values.attachmentIds.trim() !== '') {
        payload.attachmentIds = attachmentIds;
      }
      const url = initial
        ? `/api/${siteSlug}/admin/exhibition/${initial.id}`
        : `/api/${siteSlug}/admin/exhibition`;
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
      if (onSuccess) onSuccess();
      router.refresh();
      if (!initial) {
        setValues((c) => ({ ...c, title: '', slug: '', attachmentIds: '' }));
      }
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
          開始日期
          <input
            type="date"
            value={values.startDate}
            onChange={(event) => update('startDate', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          結束日期
          <input
            type="date"
            value={values.endDate}
            onChange={(event) => update('endDate', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        地點
        <input
          value={values.location}
          onChange={(event) => update('location', event.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <label className="block text-sm font-medium">
        說明
        <textarea
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <label className="block text-sm font-medium">
        意見回饋摘要
        <textarea
          value={values.feedbackSummary}
          onChange={(event) => update('feedbackSummary', event.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <label className="block text-sm font-medium">
          排序
          <input
            type="number"
            value={values.sortOrder}
            onChange={(event) => update('sortOrder', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          附件媒體 ID（逗號分隔，依序）
          <input
            value={values.attachmentIds}
            onChange={(event) => update('attachmentIds', event.target.value)}
            placeholder="例如 1,2,3"
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
          <span className="text-xs text-gray-400">以 ContentAttachment 關聯，需同站點媒體</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : initial ? '更新展覽' : '建立展覽'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
