'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export type FeatureEntryFormValue = {
  id: number;
  title: string;
  content: string;
  contentType: 'text' | 'youtube' | 'image';
  youtubeUrl: string;
  mediaId: number | null;
  mediaUrl: string | null;
};

export default function FeatureEntryForm({
  siteSlug,
  featurePath,
  initial,
}: {
  siteSlug: string;
  featurePath: string;
  initial: FeatureEntryFormValue | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [contentType, setContentType] = useState<FeatureEntryFormValue['contentType']>(initial?.contentType ?? 'text');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? '');
  const [mediaId, setMediaId] = useState<number | null>(initial?.mediaId ?? null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(initial?.mediaUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      let nextMediaId = mediaId;
      if (contentType === 'image' && imageFile) {
        const uploadData = new FormData();
        uploadData.set('file', imageFile);
        uploadData.set('altText', title);
        uploadData.set('label', imageFile.name);
        const uploadResponse = await fetch(`/api/${siteSlug}/admin/assets`, { method: 'POST', body: uploadData });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || '圖片上傳失敗');
        nextMediaId = uploadResult.id as number;
        setMediaId(nextMediaId);
        setMediaUrl(uploadResult.url as string);
      }
      if (contentType === 'image' && !nextMediaId) throw new Error('請選擇圖片');

      const payload = {
        title,
        content: content || null,
        contentType,
        youtubeUrl: contentType === 'youtube' ? youtubeUrl : null,
        mediaId: contentType === 'image' ? nextMediaId : null,
      };
      const url = initial
        ? `/api/${siteSlug}/admin/feature-entries/${featurePath}/${initial.id}`
        : `/api/${siteSlug}/admin/feature-entries/${featurePath}`;
      const response = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '儲存失敗');

      router.push(`/${siteSlug}/admin/${featurePath}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5 max-w-3xl">
      <label className="block text-sm font-medium">
        標題
        <input value={title} onChange={(event) => setTitle(event.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-lg" />
      </label>

      <label className="block text-sm font-medium">
        內容類型
        <select
          value={contentType}
          onChange={(event) => setContentType(event.target.value as FeatureEntryFormValue['contentType'])}
          className="mt-1 w-full px-3 py-2 border rounded-lg"
        >
          <option value="text">文字</option>
          <option value="youtube">YouTube</option>
          <option value="image">圖片</option>
        </select>
      </label>

      {contentType === 'text' && (
        <label className="block text-sm font-medium">
          內文
          <textarea value={content} onChange={(event) => setContent(event.target.value)} required rows={7} className="mt-1 w-full px-3 py-2 border rounded-lg" />
        </label>
      )}

      {contentType === 'youtube' && (
        <>
          <label className="block text-sm font-medium">
            YouTube 網址
            <input type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} required className="mt-1 w-full px-3 py-2 border rounded-lg" placeholder="https://youtu.be/..." />
          </label>
          <label className="block text-sm font-medium">
            說明（選填）
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
        </>
      )}

      {contentType === 'image' && (
        <>
          <label className="block text-sm font-medium">
            圖片
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full" />
          </label>
          {mediaUrl && <Image src={mediaUrl} alt={title} width={640} height={360} unoptimized className="max-h-64 rounded border object-contain" />}
          <label className="block text-sm font-medium">
            說明（選填）
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="mt-1 w-full px-3 py-2 border rounded-lg" />
          </label>
        </>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {saving ? '儲存中...' : initial ? '更新資料' : '新增資料'}
        </button>
        <button type="button" onClick={() => router.push(`/${siteSlug}/admin/${featurePath}`)} className="px-4 py-2 border rounded-lg">
          取消
        </button>
        {message && <span role="status" className="text-sm text-red-600">{message}</span>}
      </div>
    </form>
  );
}
