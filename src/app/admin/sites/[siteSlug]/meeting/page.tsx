import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import MeetingForm from './MeetingForm';
import DeleteMeetingButton from './DeleteButton';

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

function meetingTypeLabel(type: string) {
  const map: Record<string, string> = {
    board: '理監事會',
    general: '會員大會',
    other: '其他',
  };
  return map[type] ?? type;
}

export default async function MeetingAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.meetingRecord.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ meetingDate: 'desc' }, { sortOrder: 'asc' }],
  });

  const canWrite = canPerformContentAction(context.siteRole, 'write');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{context.site.name} - 會議記錄</h2>
          <p className="text-gray-500">管理會議類型、日期與 PDF 附件，圖片需標記為額外圖片。</p>
        </div>
      </div>

      {canWrite && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">新增會議</h3>
          <MeetingForm siteSlug={siteSlug} initial={null} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">會議列表</h3>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-gray-500">尚無會議</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      {meetingTypeLabel(item.meetingType)}
                    </span>
                    {statusBadge(item.status)}
                    <span className="text-sm text-gray-500">{new Date(item.meetingDate).toLocaleDateString('zh-TW')}</span>
                  </div>
                  <p className="font-medium mt-1">{item.title}</p>
                  {item.meetingNo && <p className="text-xs text-gray-500">編號：{item.meetingNo}</p>}
                  {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer hover:underline">編輯</summary>
                      <div className="mt-2">
                        <MeetingForm siteSlug={siteSlug} initial={item} />
                      </div>
                    </details>
                    <DeleteMeetingButton siteSlug={siteSlug} id={item.id} />
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
