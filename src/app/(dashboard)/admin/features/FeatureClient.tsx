'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Feature {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  path: string;
  isSystem: boolean;
  displayMode: string;
  description?: string | null;
}

export default function FeatureClient({ initial }: { initial: Feature[] }) {
  const router = useRouter();
  const [features, setFeatures] = useState(initial);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [path, setPath] = useState('');
  const [displayMode, setDisplayMode] = useState('list');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Feature | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editDisplayMode, setEditDisplayMode] = useState('list');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, icon, path, displayMode }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || '新增失敗');
      return;
    }
    const created = await res.json();
    setFeatures([...features, created]);
    setLabel('');
    setIcon('');
    setPath('');
    setDisplayMode('list');
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm('確定刪除？')) return;
    const res = await fetch(`/api/admin/features/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFeatures(features.filter((f) => f.id !== id));
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || '刪除失敗');
    }
  }

  function startEdit(f: Feature) {
    setEditing(f);
    setEditLabel(f.label);
    setEditIcon(f.icon || '');
    setEditPath(f.path);
    setEditDisplayMode(f.displayMode || 'list');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch(`/api/admin/features/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editLabel, icon: editIcon, path: editPath, displayMode: editDisplayMode }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || '更新失敗');
      return;
    }
    const updated = await res.json();
    setFeatures(features.map((f) => (f.id === updated.id ? updated : f)));
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm">key</th>
              <th className="px-4 py-2 text-left text-sm">名稱</th>
              <th className="px-4 py-2 text-left text-sm">圖示</th>
              <th className="px-4 py-2 text-left text-sm">路徑</th>
              <th className="px-4 py-2 text-left text-sm">顯示</th>
              <th className="px-4 py-2 text-left text-sm">系統</th>
              <th className="px-4 py-2 text-right text-sm">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {features.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-2 text-gray-500">{f.key}</td>
                <td className="px-4 py-2">{f.label}</td>
                <td className="px-4 py-2">{f.icon || '-'}</td>
                <td className="px-4 py-2">{f.path}</td>
                <td className="px-4 py-2">{f.displayMode === 'card' ? '卡片' : f.displayMode === 'grid' ? '網格' : '條列'}</td>
                <td className="px-4 py-2">{f.isSystem ? '是' : '否'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => startEdit(f)} className="text-blue-600 hover:underline">
                    修改
                  </button>
                  {!f.isSystem && (
                    <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:underline">
                      刪除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={handleEdit} className="bg-white p-6 rounded-lg shadow space-y-4 mb-6 border-2 border-blue-200">
          <h3 className="font-medium">修改功能：{editing.key}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">名稱</label>
              <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">圖示</label>
              <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">路徑 {editing.isSystem && <span className="text-xs text-gray-400">(系統不可改)</span>}</label>
              <input value={editPath} onChange={(e) => setEditPath(e.target.value)} required disabled={editing.isSystem} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">顯示方式</label>
              <select value={editDisplayMode} onChange={(e) => setEditDisplayMode(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="list">條列</option>
                <option value="card">卡片</option>
                <option value="grid">網格</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              儲存
            </button>
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              取消
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">新增功能選單</h3>
        {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">名稱</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" placeholder="常見問題" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">圖示</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="❓" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">路徑</label>
            <input value={path} onChange={(e) => setPath(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" placeholder="faq" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">顯示方式</label>
            <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="list">條列</option>
              <option value="card">卡片</option>
              <option value="grid">網格</option>
            </select>
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增
        </button>
      </form>
    </div>
  );
}
