'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Media, SelectionInfo } from '@prisma/client';
import { moveSelectionAttachment } from '@/lib/selectionFormState';

type MediaItem = Pick<Media, 'id' | 'filename' | 'url' | 'type' | 'mimeType' | 'sizeBytes' | 'altText'>;
type SelectionAttachment = {
  id?: number;
  mediaId: number;
  label: string | null;
  media: MediaItem;
};
type SelectionWithAttachments = SelectionInfo & { attachments: SelectionAttachment[] };

export default function SelectionForm({
  siteSlug,
  initial,
  media: initialMedia,
}: {
  siteSlug: string;
  initial: SelectionWithAttachments | null;
  media: MediaItem[];
}) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [attachments, setAttachments] = useState<SelectionAttachment[]>(initial?.attachments ?? []);
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function addMedia(item: MediaItem) {
    setAttachments((current) => current.some((attachment) => attachment.mediaId === item.id)
      ? current
      : [...current, { mediaId: item.id, label: item.altText ?? item.filename, media: item }]);
  }

  function updateLabel(mediaId: number, label: string) {
    setAttachments((current) => current.map((item) => item.mediaId === mediaId ? { ...item, label } : item));
  }

  function removeAttachment(mediaId: number) {
    setAttachments((current) => current.filter((item) => item.mediaId !== mediaId));
  }

  function moveAttachment(mediaId: number, direction: -1 | 1) {
    setAttachments((current) => moveSelectionAttachment(
      current,
      current.findIndex((item) => item.mediaId === mediaId),
      direction,
    ));
  }

  async function uploadFile(file: File) {
    const form = new FormData();
    form.set('file', file);
    form.set('altText', file.name);
    try {
      const response = await fetch(`/api/${siteSlug}/admin/assets`, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || '上傳失敗');
        return;
      }
      const uploaded: MediaItem = {
        id: result.id,
        filename: file.name,
        url: result.url,
        type: file.type === 'application/pdf' ? 'pdf' : 'image',
        mimeType: file.type,
        sizeBytes: file.size,
        altText: file.type.startsWith('image/') ? file.name : null,
      };
      setMedia((current) => [...current, uploaded]);
      addMedia(uploaded);
      setMessage(`已上傳並加入「${file.name}」`);
    } catch {
      setError('無法連線至伺服器');
    }
  }

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setError('');
    try {
      for (const file of files) await uploadFile(file);
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const values = new FormData(event.currentTarget);
    const payload = Object.fromEntries(values);
    try {
      const response = await fetch(initial
        ? `/api/${siteSlug}/admin/selection/${initial.id}`
        : `/api/${siteSlug}/admin/selection`, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, attachments: attachments.map(({ mediaId, label }) => ({ mediaId, label })) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || '儲存失敗');
        return;
      }
      setMessage('已儲存');
      router.push(`/${siteSlug}/admin/selection`);
      router.refresh();
    } catch {
      setError('無法連線至伺服器');
    } finally {
      setSaving(false);
    }
  }

  const input = 'mt-1 w-full rounded border px-3 py-2';
  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg bg-white p-6 shadow">
      <label className="block">標題<input name="title" required defaultValue={initial?.title ?? '選配作業說明'} className={input} /></label>
      <label className="block">適用階段<input name="applicableStage" defaultValue={initial?.applicableStage ?? ''} className={input} /></label>
      <label className="block">說明<textarea name="description" defaultValue={initial?.description ?? ''} rows={3} className={input} /></label>
      <label className="block">選配規則<textarea name="rules" defaultValue={initial?.rules ?? ''} rows={5} className={input} /></label>
      <label className="block">注意事項<textarea name="notice" defaultValue={initial?.notice ?? ''} rows={3} className={input} /></label>
      <label className="block">截止日期<input name="deadline" type="datetime-local" defaultValue={initial?.deadline ? new Date(initial.deadline.getTime() - initial.deadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} className={input} /></label>
      <label className="block">外部連結<input name="externalUrl" type="url" defaultValue={initial?.externalUrl ?? ''} className={input} /></label>
      <label className="block">狀態<select name="status" defaultValue={initial?.status ?? 'draft'} className={input}><option value="draft">草稿</option><option value="published">已發布</option><option value="archived">已封存</option></select></label>

      <fieldset className="space-y-3 border-t pt-4">
        <legend className="font-semibold">檔案與圖片</legend>
        <p className="text-sm text-gray-600">可加入本站媒體庫中的 PDF 或圖片；新檔案上傳後會自動加入此項目。</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-60 flex-1">選擇本站檔案
            <select value={selectedMediaId} onChange={(event) => setSelectedMediaId(event.target.value)} className={input}>
              <option value="">選擇圖片或 PDF</option>
              {media.map((item) => <option key={item.id} value={item.id}>{item.type === 'image' ? '圖片' : 'PDF'}：{item.filename}</option>)}
            </select>
          </label>
          <button type="button" disabled={!selectedMediaId} onClick={() => {
            const item = media.find((candidate) => candidate.id === Number(selectedMediaId));
            if (item) addMedia(item);
          }} className="rounded border px-3 py-2 text-sm disabled:opacity-50">加入附件</button>
          <label className="cursor-pointer rounded border px-3 py-2 text-sm">
            {uploading ? '上傳中…' : '上傳新檔'}
            <input type="file" multiple accept="application/pdf,image/avif,image/gif,image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only" onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              if (files.length) void uploadFiles(files);
              event.currentTarget.value = '';
            }} />
          </label>
        </div>

        {attachments.length === 0 ? <p className="text-sm text-gray-500">尚未加入附件</p> : (
          <ul className="space-y-3">
            {attachments.map(({ media: item, mediaId, label }, index) => (
              <li key={mediaId} className="flex flex-wrap items-center gap-3 rounded border p-3">
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.altText || label || item.filename} className="h-20 w-28 rounded border object-cover" />
                ) : (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">預覽／下載 PDF</a>
                )}
                <label className="min-w-48 flex-1 text-sm">顯示名稱
                  <input value={label ?? ''} onChange={(event) => updateLabel(mediaId, event.target.value)} className={input} />
                </label>
                <div className="flex gap-2">
                  <button type="button" disabled={index === 0} onClick={() => moveAttachment(mediaId, -1)} aria-label={`上移 ${item.filename}`} className="rounded border px-2 py-1 text-sm disabled:opacity-40">↑</button>
                  <button type="button" disabled={index === attachments.length - 1} onClick={() => moveAttachment(mediaId, 1)} aria-label={`下移 ${item.filename}`} className="rounded border px-2 py-1 text-sm disabled:opacity-40">↓</button>
                </div>
                <button type="button" onClick={() => removeAttachment(mediaId)} className="text-sm text-red-700 underline">移除此附件</button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      <div className="flex gap-3">
        <button disabled={saving || uploading} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? '儲存中…' : '儲存'}</button>
        <a href={`/${siteSlug}/admin/selection`} className="rounded border px-4 py-2">取消</a>
      </div>
    </form>
  );
}
