'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgressItem } from '@prisma/client';
import { Input, Select, TextArea } from '@/components/admin';

type ProgressFormValues = {
  stageDate: string;
  stageLabel: string;
  title: string;
  summary: string;
  content: string;
  progressStatus: 'completed' | 'current' | 'upcoming';
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
};

type Props = {
  siteSlug: string;
  initial: ProgressItem | null;
  onSuccess?: () => void;
};

const PROGRESS_STATUS_OPTIONS = [
  { value: 'completed', label: '已完成' },
  { value: 'current', label: '進行中' },
  { value: 'upcoming', label: '待辦' },
];

const CONTENT_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已發布' },
  { value: 'archived', label: '封存' },
];

function toDateInput(value: Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

export default function ProgressForm({ siteSlug, initial, onSuccess }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ProgressFormValues>(() => ({
    stageDate: initial ? toDateInput(initial.stageDate) : '',
    stageLabel: initial?.stageLabel ?? '',
    title: initial?.title ?? '',
    summary: initial?.summary ?? '',
    content: initial?.content ?? '',
    progressStatus: (initial?.progressStatus as ProgressFormValues['progressStatus']) ?? 'upcoming',
    status: (initial?.status as ProgressFormValues['status']) ?? 'draft',
    sortOrder: initial ? Number(initial.sortOrder) : 0,
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof ProgressFormValues, value: string | number | 'completed' | 'current' | 'upcoming' | 'draft' | 'published' | 'archived') {
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
        setValues({
          stageDate: '',
          stageLabel: '',
          title: '',
          summary: '',
          content: '',
          progressStatus: 'upcoming',
          status: 'draft',
          sortOrder: 0,
        });
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
        <Input
          label="階段日期"
          type="date"
          value={values.stageDate}
          onChange={(e) => update('stageDate', e.target.value)}
          required
          placeholder="選擇日期"
        />
        <Input
          label="階段名稱"
          value={values.stageLabel}
          onChange={(e) => update('stageLabel', e.target.value)}
          required
          placeholder="例如：規劃階段"
        />
      </div>

      <Input
        label="標題"
        value={values.title}
        onChange={(e) => update('title', e.target.value)}
        required
        placeholder="進度標題"
      />

      <TextArea
        label="摘要"
        value={values.summary}
        onChange={(e) => update('summary', e.target.value)}
        rows={2}
        placeholder="簡短摘要（可選）"
      />

      <TextArea
        label="內容"
        value={values.content}
        onChange={(e) => update('content', e.target.value)}
        rows={4}
        placeholder="進度詳細內容（可選）"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="進度狀態（progressStatus）"
          value={values.progressStatus}
          onChange={(e) => update('progressStatus', e.target.value as ProgressFormValues['progressStatus'])}
          options={PROGRESS_STATUS_OPTIONS}
        />
        <Select
          label="發布狀態"
          value={values.status}
          onChange={(e) => update('status', e.target.value as ProgressFormValues['status'])}
          options={CONTENT_STATUS_OPTIONS}
        />
        <Input
          label="排序"
          type="number"
          value={String(values.sortOrder)}
          onChange={(e) => update('sortOrder', parseInt(e.target.value, 10) || 0)}
          min={0}
          placeholder="0"
        />
      </div>

      {message && (
        <p className="text-sm">
          {message === '已儲存' ? (
            <span className="text-green-600">{message}</span>
          ) : (
            <span className="text-red-600">{message}</span>
          )}
        </p>
      )}

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
      </div>
    </form>
  );
}
