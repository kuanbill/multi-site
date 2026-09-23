'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Vendor } from '@prisma/client';

type VendorFormValues = {
  name: string;
  category: string;
  summary: string;
  description: string;
  services: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  logoMediaId: string;
  status: string;
  sortOrder: string;
  attachmentIds: string;
};

type Props = {
  siteSlug: string;
  initial: Vendor | null;
  onSuccess?: () => void;
};

export default function VendorForm({ siteSlug, initial, onSuccess }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<VendorFormValues>(() => ({
    name: initial?.name ?? '',
    category: initial?.category ?? '',
    summary: initial?.summary ?? '',
    description: initial?.description ?? '',
    services: initial?.services ?? '',
    contactName: initial?.contactName ?? '',
    contactPhone: initial?.contactPhone ?? '',
    contactEmail: initial?.contactEmail ?? '',
    logoMediaId: initial?.logoMediaId ? String(initial.logoMediaId) : '',
    status: initial?.status ?? 'draft',
    sortOrder: initial ? String(initial.sortOrder) : '0',
    attachmentIds: '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update(field: keyof VendorFormValues, value: string) {
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

      const payload = {
        name: values.name,
        category: values.category,
        summary: values.summary || null,
        description: values.description || null,
        services: values.services || null,
        contactName: values.contactName || null,
        contactPhone: values.contactPhone || null,
        contactEmail: values.contactEmail || null,
        logoMediaId: values.logoMediaId ? Number(values.logoMediaId) : null,
        status: values.status,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
        attachmentIds,
      };
      const url = initial
        ? `/api/${siteSlug}/admin/vendors/${initial.id}`
        : `/api/${siteSlug}/admin/vendors`;
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
        setValues((c) => ({ ...c, name: '', category: '', attachmentIds: '' }));
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
          名稱
          <input
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          分類
          <input
            value={values.category}
            onChange={(event) => update('category', event.target.value)}
            required
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
        介紹
        <textarea
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
      </label>

      <label className="block text-sm font-medium">
        服務項目
        <textarea
          value={values.services}
          onChange={(event) => update('services', event.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
          placeholder="每行一項或以逗號分隔"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block text-sm font-medium">
          聯絡人
          <input
            value={values.contactName}
            onChange={(event) => update('contactName', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          電話
          <input
            value={values.contactPhone}
            onChange={(event) => update('contactPhone', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
        <label className="block text-sm font-medium">
          電子郵件
          <input
            type="email"
            value={values.contactEmail}
            onChange={(event) => update('contactEmail', event.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block text-sm font-medium">
          Logo 媒體 ID
          <input
            value={values.logoMediaId}
            onChange={(event) => update('logoMediaId', event.target.value)}
            placeholder="同站點媒體 ID"
            className="mt-1 w-full px-3 py-2 border rounded-lg"
          />
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
        契約附件媒體 ID（逗號分隔，依序）
        <input
          value={values.attachmentIds}
          onChange={(event) => update('attachmentIds', event.target.value)}
          placeholder="例如 1,2"
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        />
        <span className="text-xs text-gray-400">以 ContentAttachment 關聯契約文件</span>
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : initial ? '更新廠商' : '建立廠商'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
