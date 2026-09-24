'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type LegacyContentItem = {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  createdAt: string;
  published?: boolean;
};

type LegacyEditorItem = Pick<LegacyContentItem, 'id' | 'title' | 'slug' | 'content' | 'published'>;
type LegacyFeatureKey = 'pages' | 'posts';
type LegacyView = 'list' | 'new' | 'edit';

export default function LegacyPagePostManager({
  siteSlug,
  featureKey,
  featureLabel,
  entries,
  canWrite,
  initialView,
  initialEntry,
}: {
  siteSlug: string;
  featureKey: LegacyFeatureKey;
  featureLabel: string;
  entries: LegacyContentItem[];
  canWrite: boolean;
  initialView: LegacyView;
  initialEntry: LegacyEditorItem | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [slug, setSlug] = useState(initialEntry?.slug ?? '');
  const [content, setContent] = useState(initialEntry?.content ?? '');
  const [published, setPublished] = useState(initialEntry?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const collectionUrl = `/api/${siteSlug}/admin/${featureKey}`;
  const listUrl = `/${siteSlug}/admin/${featureKey}`;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const payload: Record<string, unknown> = { title, slug, content: content || null };
    if (featureKey === 'posts') payload.published = published;
    try {
      const response = await fetch(initialEntry ? `${collectionUrl}/${initialEntry.id}` : collectionUrl, {
        method: initialEntry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '儲存失敗');
      router.push(listUrl);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: LegacyContentItem) {
    if (!confirm(`確定刪除「${item.title}」？`)) return;
    setDeletingId(item.id);
    setMessage('');
    try {
      const response = await fetch(`${collectionUrl}/${item.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '刪除失敗');
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '刪除失敗');
    } finally {
      setDeletingId(null);
    }
  }

  if (initialView !== 'list') {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-2">{featureLabel} - {initialEntry ? '編輯' : '新增'}</h2>
        <p className="text-gray-500 mb-6">沿用既有 {featureKey === 'pages' ? 'Page' : 'Post'} 資料與前台路由。</p>
        <form onSubmit={save} className="bg-white rounded-lg shadow p-6 space-y-5 max-w-3xl">
          <label className="block text-sm font-medium">
            標題
            <input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="block text-sm font-medium">
            Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          <label className="block text-sm font-medium">
            內文
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
          {featureKey === 'posts' && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
              發布於前台
            </label>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? '儲存中...' : initialEntry ? '更新' : '新增'}
            </button>
            <button type="button" onClick={() => router.push(listUrl)} className="px-4 py-2 border rounded-lg">返回列表</button>
            {message && <span role="status" className="text-sm text-red-600">{message}</span>}
          </div>
        </form>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{featureLabel}</h2>
          <p className="text-gray-500">管理既有 {featureKey === 'pages' ? 'Page' : 'Post'} 資料。</p>
        </div>
        {canWrite && <Link href={`${listUrl}/new`} className="px-4 py-2 bg-blue-600 text-white rounded-lg">新增資料</Link>}
      </div>
      {message && <p role="status" className="mb-4 text-sm text-red-600">{message}</p>}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? <p className="p-6 text-gray-500">尚無資料</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">標題</th>
                <th className="px-4 py-3">Slug</th>
                {featureKey === 'posts' && <th className="px-4 py-3">狀態</th>}
                <th className="px-4 py-3">建立日期</th>
                {canWrite && <th className="px-4 py-3">操作</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">{item.slug}</td>
                  {featureKey === 'posts' && <td className="px-4 py-3">{item.published ? '已發布' : '未發布'}</td>}
                  <td className="px-4 py-3 text-gray-500">{item.createdAt}</td>
                  {canWrite && <td className="px-4 py-3"><div className="flex gap-3">
                    <Link href={`${listUrl}/${item.id}/edit`} className="text-blue-600 hover:underline">編輯</Link>
                    <button type="button" disabled={deletingId === item.id} onClick={() => void remove(item)} className="text-red-600 hover:underline disabled:opacity-50">{deletingId === item.id ? '刪除中...' : '刪除'}</button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
