import Link from 'next/link';
import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import ProgressForm from './ProgressForm';
import DeleteProgressButton from './DeleteButton';

export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-yellow-100 text-yellow-700',
  };
  const label: Record<string, string> = {
    draft: '草稿',
    published: '已發布',
    archived: '封存',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

function progressStatusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-gray-100 text-gray-600',
    current: 'bg-blue-100 text-blue-700',
    upcoming: 'bg-orange-100 text-orange-700',
  };
  const label: Record<string, string> = {
    completed: '已完成',
    current: '進行中',
    upcoming: '待辦',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

export default async function ProgressListPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.progressItem.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ stageDate: 'asc' }, { sortOrder: 'asc' }],
  });

  const canWrite = canPerformContentAction(context.siteRole, 'write');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{context.site.name} - 都更進度</h2>
          <p className="text-gray-500">管理階段時間軸，進行中項目僅允許一筆已發布。</p>
        </div>
      </div>

      {canWrite && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">新增進度</h3>
          <ProgressForm siteSlug={siteSlug} initial={null} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">進度列表</h3>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-gray-500">尚無進度</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{new Date(item.stageDate).toLocaleDateString('zh-TW')}</span>
                    {progressStatusBadge(item.progressStatus)}
                    {statusBadge(item.status)}
                  </div>
                  <p className="font-medium mt-1">
                    {item.stageLabel} - {item.title}
                  </p>
                  {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/${siteSlug}/admin/progress/${item.id}/edit`} className="text-blue-600 hover:underline text-sm">
                      編輯
                    </Link>
                    <DeleteProgressButton siteSlug={siteSlug} id={item.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
