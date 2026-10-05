'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LogPanelType = 'logins' | 'views';

const LABELS: Record<LogPanelType, { name: string; confirm: string }> = {
  logins: {
    name: '登入紀錄',
    confirm: '確定要清除所有登入紀錄嗎？此操作無法復原。',
  },
  views: {
    name: '瀏覽記錄',
    confirm: '確定要清除本站的瀏覽記錄嗎？此操作無法復原。',
  },
};

export default function LogPanelActions({
  siteSlug,
  type,
  canExport,
  canClear,
}: {
  siteSlug: string;
  type: LogPanelType;
  canExport: boolean;
  canClear: boolean;
}) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const label = LABELS[type];

  if (!canExport && !canClear) return null;

  async function handleClear() {
    if (!confirm(label.confirm)) return;
    setClearing(true);
    try {
      const response = await fetch(`/api/${siteSlug}/admin/activity?type=${type}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        alert(result.error || '清除失敗');
        return;
      }
      router.refresh();
    } catch {
      alert('無法連線至伺服器');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm">
      {canExport && (
        <a href={`/api/${siteSlug}/admin/activity/export?type=${type}`} className="text-blue-600 hover:underline">
          匯出 CSV
        </a>
      )}
      {canClear && (
        <button
          onClick={handleClear}
          disabled={clearing}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          {clearing ? '清除中...' : '清除'}
        </button>
      )}
    </div>
  );
}
