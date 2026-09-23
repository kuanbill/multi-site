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
}

export default function FeatureClient({ initial }: { initial: Feature[] }) {
  const router = useRouter();
  const [features, setFeatures] = useState(initial);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [path, setPath] = useState('');
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, icon, path }),
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
    router.refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm('確定刪除？')) return;
    const res = await fetch(`/api/admin/features/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setFeatures(features.filter((f) => f.id !== id));
      router.refresh();
    }
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
                <td className="px-4 py-2">{f.isSystem ? '是' : '否'}</td>
                <td className="px-4 py-2 text-right">
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

      <form onSubmit={handleAdd} className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">新增功能選單</h3>
        {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-3 gap-4">
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
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增
        </button>
      </form>
    </div>
  );
}
