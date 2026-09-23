'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  path: string;
  enabled: boolean;
  sortOrder: number;
  displayMode: string;
  visibility: 'public' | 'members';
}

export default function SiteFeatureClient({
  siteSlug,
  initial,
  canManageSettings,
}: {
  siteSlug: string;
  initial: Item[];
  canManageSettings: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(() => [...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  function toggle(id: number) {
    setItems(items.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)));
  }

  function changeOrder(id: number, order: number) {
    setItems(items.map((it) => (it.id === id ? { ...it, sortOrder: order } : it)));
  }

  function changeDisplayMode(id: number, mode: string) {
    setItems(items.map((it) => (it.id === id ? { ...it, displayMode: mode } : it)));
  }

  function changeVisibility(id: number, visibility: Item['visibility']) {
    setItems(items.map((it) => (it.id === id ? { ...it, visibility } : it)));
  }

  async function save() {
    setSaving(true);
    setMsg('');
    const res = await fetch(`/api/${siteSlug}/admin/features`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        features: items.map((it) => ({
          featureId: it.id,
          enabled: it.enabled,
          sortOrder: it.sortOrder,
          displayMode: it.displayMode,
          visibility: it.visibility,
        })),
      }),
    });
    if (res.ok) {
      setMsg('已儲存');
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error || '儲存失敗');
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {!canManageSettings && <p className="mb-4 text-sm text-amber-700">您只有檢視權限，請聯絡站點管理員修改功能設定。</p>}
      <table className="w-full mb-4">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm">啟用</th>
            <th className="px-4 py-2 text-left text-sm">名稱</th>
            <th className="px-4 py-2 text-left text-sm">路徑</th>
            <th className="px-4 py-2 text-left text-sm">顯示</th>
            <th className="px-4 py-2 text-left text-sm">前台可見性</th>
            <th className="px-4 py-2 text-left text-sm">排序</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-2">
                <input type="checkbox" checked={it.enabled} disabled={!canManageSettings} onChange={() => toggle(it.id)} />
              </td>
              <td className="px-4 py-2">
                {it.icon} {it.label} <span className="text-gray-400 text-xs">({it.key})</span>
              </td>
              <td className="px-4 py-2 text-gray-500">{it.path}</td>
               <td className="px-4 py-2">
                  <select value={it.displayMode} disabled={!canManageSettings} onChange={(e) => changeDisplayMode(it.id, e.target.value)} className="px-2 py-1 border rounded text-sm disabled:bg-gray-100">
                  <option value="list">條列</option>
                  <option value="card">卡片</option>
                  <option value="grid">網格</option>
                 </select>
               </td>
              <td className="px-4 py-2">
                <select
                  value={it.visibility}
                   disabled={!canManageSettings}
                  onChange={(e) => changeVisibility(it.id, e.target.value as Item['visibility'])}
                  className="px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                >
                  <option value="public">公開</option>
                  <option value="members">僅限成員</option>
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={it.sortOrder}
                  disabled={!canManageSettings}
                  onChange={(e) => changeOrder(it.id, parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={save}
        disabled={saving || !canManageSettings}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '儲存中...' : '儲存'}
      </button>
      {msg && <span className="ml-4 text-sm text-gray-600">{msg}</span>}
    </div>
  );
}
