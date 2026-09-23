'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeetingRecord } from '@prisma/client';

type MeetingFormValues = {
  meetingType: string;
  meetingNo: string;
  title: string;
  meetingDate: string;
  summary: string;
  status: string;
  sortOrder: string;
  attachmentIds: string;
  imageAttachmentIds: string;
};

type Props = {
  siteSlug: string;
  initial: MeetingRecord | null;
  onSuccess?: () => void;
};

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function MeetingForm({ siteSlug, initial, onSuccess }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<MeetingFormValues>(() => ({
    meetingType: initial?.meetingType ?? 'board',
    meetingNo: initial?.meetingNo ?? '',
    title: initial?.title ?? '',
    meetingDate: toDateInput(initial?.meetingDate),
    summary: initial?.summary ?? '',
    status: initial?.status ?? 'draft',
    sortOrder: initial ? String(initial.sortOrder) : '0',
    attachmentIds: '',
    imageAttachmentIds: '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof MeetingFormValues, value: string) {
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
      const imageAttachmentIds = values.imageAttachmentIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0);

      const payload = {
        meetingType: values.meetingType,
        meetingNo: values.meetingNo || null,
        title: values.title,
        meetingDate: values.meetingDate,
        summary: values.summary || null,
        status: values.status,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
        attachmentIds,
        imageAttachmentIds,
      };
      const url = initial
        ? `/api/${siteSlug}/admin/meeting/${initial.id}`
        : `/api/${siteSlug}/admin/meeting`;
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
        setValues((c) => ({ ...c, title: '', meetingNo: '', summary: '', attachmentIds: '', imageAttachmentIds: '' }));
      }
    } catch {
      setMessage('無法連線至伺服器');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block text-sm font-medium">
          會議類型
          <select
            value={values.meetingType}
            onChange={(event) => update('meetingType', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          >
            <option value="board">理監事會</option>
            <option value="general">會員大會</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          會議編號
          <input
            value={values.meetingNo}
            onChange={(event) => update('meetingNo', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          會議日期
          <input
            type="date"
            value={values.meetingDate}
            onChange={(event) => update('meetingDate', event.target.value)}
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
        <div />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          PDF 附件媒體 ID（逗號分隔）
          <input
            value={values.attachmentIds}
            onChange={(event) => update('attachmentIds', event.target.value)}
            placeholder="例如 4,5"
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
          <span className="text-xs text-gray-400">僅限 PDF，若含圖片將被拒絕</span>
        </label>
        <label className="block text-sm font-medium">
          額外圖片附件媒體 ID（逗號分隔）
          <input
            value={values.imageAttachmentIds}
            onChange={(event) => update('imageAttachmentIds', event.target.value)}
            placeholder="例如 6"
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
          <span className="text-xs text-gray-400">標記為額外圖片才允許圖片類型</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : initial ? '更新會議' : '建立會議'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
