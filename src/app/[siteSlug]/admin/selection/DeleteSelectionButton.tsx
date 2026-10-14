'use client';

import { useState } from 'react';

export default function DeleteSelectionButton({ siteSlug, id, title }: { siteSlug: string; id: number; title: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm(`確定要刪除「${title}」嗎？附件關聯也會移除。`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/${siteSlug}/admin/selection/${id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || '刪除失敗');
        setDeleting(false);
        return;
      }
      window.location.reload();
    } catch {
      setError('無法連線至伺服器');
      setDeleting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={remove} disabled={deleting} className="text-sm text-red-700 underline disabled:opacity-50">
        {deleting ? '刪除中…' : '刪除'}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
