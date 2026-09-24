'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FeatureEntryListItem = {
  id: number;
  title: string;
  contentType: string;
  updatedAt: string;
  mediaUrl: string | null;
};

export default function FeatureEntryList({
  siteSlug,
  featurePath,
  featureLabel,
  entries,
  canWrite,
}: {
  siteSlug: string;
  featurePath: string;
  featureLabel: string;
  entries: FeatureEntryListItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const collectionUrl = `/api/${siteSlug}/admin/feature-entries/${featurePath}`;

  async function deleteEntry(entry: FeatureEntryListItem) {
    if (!confirm(`確定刪除「${entry.title}」？`)) return;
    setDeletingId(entry.id);
    setMessage('');
    try {
      const response = await fetch(`${collectionUrl}/${entry.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || '刪除失敗');
        return;
      }
      router.refresh();
    } catch {
      setMessage('無法連線至伺服器');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{featureLabel}</h2>
          <p className="text-gray-500">管理此功能的文字、YouTube 影片與圖片。</p>
        </div>
        {canWrite && (
          <Link href={`/${siteSlug}/admin/${featurePath}/new`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            新增資料
          </Link>
        )}
      </div>

      {message && <p role="status" className="mb-4 text-sm text-red-600">{message}</p>}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {entries.length === 0 ? (
          <p className="p-6 text-gray-500">尚無資料</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">標題</th>
                <th className="px-4 py-3">類型</th>
                <th className="px-4 py-3">更新日期</th>
                {canWrite && <th className="px-4 py-3">操作</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {entry.mediaUrl && <Image src={entry.mediaUrl} alt="" width={56} height={40} unoptimized className="h-10 w-14 rounded object-cover" />}
                      <span className="font-medium">{entry.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{entry.contentType === 'youtube' ? 'YouTube' : entry.contentType === 'image' ? '圖片' : '文字'}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.updatedAt}</td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link href={`/${siteSlug}/admin/${featurePath}/${entry.id}/edit`} className="text-blue-600 hover:underline">
                          編輯
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === entry.id}
                          onClick={() => void deleteEntry(entry)}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === entry.id ? '刪除中...' : '刪除'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
