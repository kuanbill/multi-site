'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type MediaItem = {
  id: number;
  filename: string;
  url: string;
  type: string;
  mimeType: string | null;
  sizeBytes: number | null;
  altText: string | null;
  createdAt: string;
};

type Filter = 'all' | 'image' | 'pdf';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '圖片' },
  { value: 'pdf', label: 'PDF' },
];

function formatSize(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function MediaLibrary({
  siteSlug,
  items,
  usedIds,
  canWrite,
  canDelete,
}: {
  siteSlug: string;
  items: MediaItem[];
  usedIds: number[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const usedSet = new Set(usedIds);
  const visible = filter === 'all' ? items : items.filter((item) => item.type === filter);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setMessage('');
    let uploaded = 0;
    let failure = '';
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set('file', file);
      form.set('altText', file.name);
      try {
        const response = await fetch(`/api/${siteSlug}/admin/assets`, { method: 'POST', body: form });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          uploaded += 1;
        } else if (!failure) {
          failure = result.error || `${file.name} 上傳失敗`;
        }
      } catch {
        failure = '無法連線至伺服器';
      }
    }
    setUploading(false);
    if (uploaded > 0) setMessage(`已上傳 ${uploaded} 個檔案`);
    if (failure) setError(failure);
    if (uploaded > 0) router.refresh();
  }

  async function saveAltText(item: MediaItem) {
    setSavingEdit(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/${siteSlug}/admin/assets/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: editingValue }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || '儲存失敗');
        return;
      }
      setEditingId(null);
      setMessage('已儲存');
      router.refresh();
    } catch {
      setError('無法連線至伺服器');
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`確定要刪除「${item.altText ?? item.filename}」這個檔案嗎？`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/${siteSlug}/admin/assets/${item.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || '刪除失敗');
        return;
      }
      setMessage('已刪除');
      router.refresh();
    } catch {
      setError('無法連線至伺服器');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                filter === option.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {canWrite && (
          <label className={`text-sm ${uploading ? 'opacity-50' : ''}`}>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(event) => {
                void handleUpload(event.target.files);
                event.target.value = '';
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploading && <span className="text-blue-600">上傳中...</span>}
          </label>
        )}
      </div>

      {!canWrite && (
        <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          您只有檢視權限，無法上傳或修改媒體。
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          {items.length === 0 ? '尚無媒體檔案，請上傳圖片或 PDF。' : '此分類下沒有媒體檔案。'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">預覽</th>
                <th className="px-4 py-3">檔案</th>
                <th className="px-4 py-3">類型</th>
                <th className="px-4 py-3">大小</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">上傳日期</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const editing = editingId === item.id;
                const used = usedSet.has(item.id);
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      {item.type === 'image' ? (
                        <Image
                          src={item.url}
                          alt={item.altText ?? ''}
                          width={64}
                          height={64}
                          className="rounded object-cover border"
                          unoptimized
                        />
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded border text-red-500 text-xs text-center px-1 break-all"
                        >
                          PDF
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium break-all">{item.altText ?? item.filename}</p>
                      <p className="text-xs text-gray-400 break-all">{item.filename}</p>
                      <p className="text-xs text-gray-400">{item.mimeType ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3">{item.type === 'pdf' ? 'PDF' : '圖片'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatSize(item.sizeBytes)}</td>
                    <td className="px-4 py-3">{item.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-4 py-3">
                      {used ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">使用中</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">未使用</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 min-w-[9rem]">
                        {canWrite && !editing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingValue(item.altText ?? '');
                              setError('');
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 w-fit"
                          >
                            編輯說明
                          </button>
                        )}
                        {canWrite && editing && (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingValue}
                              onChange={(event) => setEditingValue(event.target.value)}
                              placeholder="說明文字"
                              className="w-40 px-2 py-1 border rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => saveAltText(item)}
                              disabled={savingEdit}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {savingEdit ? '儲存中...' : '儲存'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                            >
                              取消
                            </button>
                          </div>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => remove(item)}
                            className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 w-fit"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message && !error && <p className="mt-4 text-sm text-gray-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
