'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteMeetingButton({ siteSlug, id }: { siteSlug: string; id: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('確定要刪除此會議？')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/${siteSlug}/admin/meeting/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        alert(result.error || '刪除失敗');
        return;
      }
      router.refresh();
    } catch {
      alert('無法連線至伺服器');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={deleting} className="text-red-600 hover:underline text-sm disabled:opacity-50">
      {deleting ? '刪除中...' : '刪除'}
    </button>
  );
}
