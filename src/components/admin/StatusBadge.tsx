'use client';

import { CONTENT_STATUSES, type ContentStatus } from '@/lib/contentTypes';

const STATUS_CONFIG: Record<ContentStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
  published: { label: '已發布', className: 'bg-green-100 text-green-700' },
  archived: { label: '封存', className: 'bg-yellow-100 text-yellow-700' },
};

export function StatusBadge({ status }: { status: ContentStatus | string }) {
  const config = STATUS_CONFIG[status as ContentStatus];
  if (!config) {
    return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{status}</span>;
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ProgressStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: '已完成', className: 'bg-blue-100 text-blue-700' },
    current: { label: '進行中', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
    upcoming: { label: '待辦', className: 'bg-gray-100 text-gray-600' },
  };
  const c = config[status];
  if (!c) return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{status}</span>;
  return <span className={`px-2 py-0.5 rounded text-xs ${c.className}`}>{c.label}</span>;
}
