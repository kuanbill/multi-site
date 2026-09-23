'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SelectionInfo } from '@prisma/client';
export default function SelectionForm({ siteSlug, initial }: { siteSlug: string; initial: SelectionInfo | null }) {
  const router = useRouter(); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const data = new FormData(event.currentTarget);
    try { const response = await fetch(`/api/${siteSlug}/admin/selection`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) }); const result = await response.json(); setMessage(response.ok ? '已儲存' : result.error || '儲存失敗'); if (response.ok) router.refresh(); }
    catch { setMessage('無法連線至伺服器'); } finally { setSaving(false); }
  }
  const input = 'mt-1 w-full border rounded px-3 py-2';
  return <form onSubmit={submit} className="bg-white p-6 rounded shadow space-y-4">
    <label className="block">標題<input name="title" required defaultValue={initial?.title ?? '選屋資訊'} className={input} /></label>
    <label className="block">適用階段<input name="applicableStage" defaultValue={initial?.applicableStage ?? ''} className={input} /></label>
    <label className="block">說明<textarea name="description" defaultValue={initial?.description ?? ''} rows={3} className={input} /></label>
    <label className="block">選屋規則<textarea name="rules" defaultValue={initial?.rules ?? ''} rows={5} className={input} /></label>
    <label className="block">注意事項<textarea name="notice" defaultValue={initial?.notice ?? ''} rows={3} className={input} /></label>
    <label className="block">截止日期<input name="deadline" type="datetime-local" defaultValue={initial?.deadline ? new Date(initial.deadline.getTime() - initial.deadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} className={input} /></label>
    <label className="block">外部連結<input name="externalUrl" type="url" defaultValue={initial?.externalUrl ?? ''} className={input} /></label>
    <label className="block">狀態<select name="status" defaultValue={initial?.status ?? 'draft'} className={input}><option value="draft">草稿</option><option value="published">已發布</option><option value="archived">封存</option></select></label>
    <button disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">{saving ? '儲存中…' : '儲存'}</button>{message && <span className="ml-3">{message}</span>}
  </form>;
}
