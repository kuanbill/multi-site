'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MapAsset } from '@prisma/client';
type MapWithMedia = MapAsset & { imageMedia?: { id: number } | null; downloadMedia?: { id: number } | null };
export default function MapForm({ siteSlug, item }: { siteSlug: string; item?: MapWithMedia }) {
  const router = useRouter(); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  async function upload(form: FormData, key: string) {
    const file = form.get(key); if (!(file instanceof File) || !file.size) return null;
    const uploadData = new FormData(); uploadData.set('file', file); uploadData.set('altText', String(form.get('title') || '地圖')); uploadData.set('label', file.name);
    const response = await fetch(`/api/${siteSlug}/admin/assets`, { method: 'POST', body: uploadData }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '上傳失敗'); return result.id as number;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget);
    try {
      const imageMediaId = await upload(form, 'imageFile'); const downloadMediaId = await upload(form, 'downloadFile');
      const payload: Record<string, unknown> = Object.fromEntries(['title', 'category', 'description', 'sortOrder', 'status'].map((key) => [key, form.get(key)]));
      payload.imageMediaId = imageMediaId ?? item?.imageMediaId ?? null; payload.downloadMediaId = downloadMediaId ?? item?.downloadMediaId ?? null;
      const response = await fetch(`/api/${siteSlug}/admin/maps${item ? `/${item.id}` : ''}`, { method: item ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || '儲存失敗'); setMessage('已儲存'); router.refresh(); if (!item) event.currentTarget.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : '儲存失敗'); } finally { setSaving(false); }
  }
  const cls = 'mt-1 w-full border rounded px-2 py-1';
  return <form onSubmit={submit} className="bg-white p-4 rounded shadow space-y-2 min-w-64">
    <label className="block">標題<input name="title" required defaultValue={item?.title} className={cls} /></label>
    <label className="block">分類<input name="category" defaultValue={item?.category ?? ''} className={cls} /></label>
    <label className="block">說明<textarea name="description" defaultValue={item?.description ?? ''} className={cls} /></label>
    <label className="block">圖片<input name="imageFile" type="file" accept="image/*" className={cls} />{item?.imageMediaId && <small>目前媒體 ID：{item.imageMediaId}</small>}</label>
    <label className="block">下載檔案（圖片或 PDF）<input name="downloadFile" type="file" accept="image/*,application/pdf" className={cls} />{item?.downloadMediaId && <small>目前媒體 ID：{item.downloadMediaId}</small>}</label>
    <label className="block">排序<input name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} className={cls} /></label>
    <label className="block">狀態<select name="status" defaultValue={item?.status ?? 'draft'} className={cls}><option value="draft">草稿</option><option value="published">已發布</option><option value="archived">封存</option></select></label>
    <button disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">{saving ? '儲存中…' : item ? '更新地圖' : '新增地圖'}</button>{message && <p role="status">{message}</p>}
  </form>;
}
