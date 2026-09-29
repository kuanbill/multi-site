'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Announcement } from '@prisma/client';
import { Input, Select, Checkbox, TextArea } from '@/components/admin';

type AnnouncementFormValues = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  pinned: boolean;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
};

type Props = {
  siteSlug: string;
  initial: Announcement | null;
  onSuccess?: () => void;
};

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已發布' },
  { value: 'archived', label: '封存' },
];

export default function AnnouncementForm({ siteSlug, initial, onSuccess }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<AnnouncementFormValues>(() => ({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    summary: initial?.summary ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? '',
    pinned: initial?.pinned ?? false,
    status: (initial?.status as AnnouncementFormValues['status']) ?? 'draft',
    sortOrder: initial ? Number(initial.sortOrder) : 0,
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof AnnouncementFormValues, value: string | number | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
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
      if (onSuccess) onSuccess();
      router.refresh();
      if (!initial) {
        setValues({
          title: '',
          slug: '',
          summary: '',
          content: '',
          category: '',
          pinned: false,
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
          label="標題"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          required
          placeholder="公告標題"
        />
        <Input
          label="識別碼（slug）"
          value={values.slug}
          onChange={(e) => update('slug', e.target.value)}
          required
          placeholder="announcements-2024"
          hint="僅小寫英文、數字與連字號"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="分類"
          value={values.category}
          onChange={(e) => update('category', e.target.value)}
          placeholder="例如：重要公告、活動公告"
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
        rows={6}
        required
        placeholder="公告詳細內容"
      />

      <div className="flex items-center gap-4">
        <Checkbox
          label="置頂"
          checked={values.pinned}
          onChange={(e) => update('pinned', e.target.checked)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="狀態"
          value={values.status}
          onChange={(e) => update('status', e.target.value as AnnouncementFormValues['status'])}
          options={STATUS_OPTIONS}
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
          {saving ? '儲存中...' : initial ? '更新公告' : '建立公告'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${siteSlug}/admin/announcement`)}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          返回列表
        </button>
      </div>
    </form>
  );
}
