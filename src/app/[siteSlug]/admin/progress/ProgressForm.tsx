'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgressItem } from '@prisma/client';

type ProgressFormValues = {
  stageDate: string;
  stageLabel: string;
  title: string;
  summary: string;
  content: string;
  progressStatus: string;
  status: string;
  sortOrder: string;
};

type Props = {
  siteSlug: string;
  initial: ProgressItem | null;
};

function toDateInput(value: Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

export default function ProgressForm({ siteSlug, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProgressFormValues>(() => ({
    stageDate: initial ? toDateInput(initial.stageDate) : '',
    stageLabel: initial?.stageLabel ?? '',
    title: initial?.title ?? '',
    summary: initial?.summary ?? '',
    content: initial?.content ?? '',
    progressStatus: initial?.progressStatus ?? 'upcoming',
    status: initial?.status ?? 'draft',
    sortOrder: initial ? String(initial.sortOrder) : '0',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof ProgressFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        stageDate: values.stageDate,
        stageLabel: values.stageLabel,
        title: values.title,
        summary: values.summary || null,
        content: values.content || null,
        progressStatus: values.progressStatus,
        status: values.status,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
      };
      const url = initial
        ? `/api/${siteSlug}/admin/progress/${initial.id}`
        : `/api/${siteSlug}/admin/progress`;
      const method = initial ? 'PATCH' : 'POST';
      // For edit, if stageDate unchanged we still send it; API allows partial but requires validation if present
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
      router.push(`/${siteSlug}/admin/progress`);
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
          階段日期
          <input
            type="date"
            value={values.stageDate}
            onChange={(event) => update('stageDate', event.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          階段名稱
          <input
            value={values.stageLabel}
            onChange={(event) => update('stageLabel', event.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
      </div>

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
          rows={4}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block text-sm font-medium">
          進度狀態
          <select
            value={values.progressStatus}
            onChange={(event) => update('progressStatus', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          >
            <option value="completed">已完成</option>
            <option value="current">進行中</option>
            <option value="upcoming">待辦</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          發布狀態
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
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : initial ? '更新進度' : '建立進度'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${siteSlug}/admin/progress`)}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          返回列表
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
