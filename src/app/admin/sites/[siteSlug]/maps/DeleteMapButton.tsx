'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteMapButton({
  siteSlug,
  id,
  title,
}: {
  siteSlug: string;
  id: number;
  title: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`確定要刪除「${title}」嗎？相關圖片與 PDF 檔案也會一併刪除。`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/${siteSlug}/admin/maps/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || '刪除失敗');
        return;
      }
      router.refresh();
    } catch {
      window.alert('無法連線至伺服器');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex min-h-11 items-center rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
    >
      {deleting ? '刪除中...' : '刪除圖資'}
    </button>
  );
}
