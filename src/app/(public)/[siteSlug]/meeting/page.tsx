import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

function meetingTypeLabel(type: string) {
  const map: Record<string, string> = {
    board: '理監事會',
    general: '會員大會',
    other: '其他',
  };
  return map[type] ?? type;
}

export default async function PublicMeetingPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'meetings');

  const items = await prisma.meetingRecord.findMany({
    where: { siteId: site.id, ...publishedWhere },
    orderBy: [{ meetingDate: 'desc' }, { sortOrder: 'asc' }],
  });

  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: site.id, ownerType: 'meeting', ownerId: { in: items.map((i) => i.id) } },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });

  const attachmentMap = new Map<number, typeof attachments>();
  for (const att of attachments) {
    const list = attachmentMap.get(att.ownerId) ?? [];
    list.push(att);
    attachmentMap.set(att.ownerId, list);
  }

  const grouped: Record<string, typeof items> = {
    board: [],
    general: [],
    other: [],
  };
  for (const item of items) {
    const key = ['board', 'general', 'other'].includes(item.meetingType) ? item.meetingType : 'other';
    grouped[key].push(item);
  }

  const typeOrder: Array<keyof typeof grouped> = ['board', 'general', 'other'];

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-2">會議記錄</h1>
        <p className="text-gray-500">{site.name} 依會議類型分組，組內依日期遞減排序</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500">尚無會議</p>
        </div>
      ) : (
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;
            return (
              <div key={type} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">{meetingTypeLabel(type)}</h2>
                <div className="divide-y">
                  {group.map((item) => {
                    const atts = attachmentMap.get(item.id) ?? [];
                    return (
                      <div key={item.id} className="py-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">{new Date(item.meetingDate).toLocaleDateString('zh-TW')}</p>
                          <h3 className="font-medium">{item.title}</h3>
                          {item.meetingNo && <p className="text-xs text-gray-500">編號：{item.meetingNo}</p>}
                          {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
                        </div>
                        <div className="shrink-0 flex flex-col gap-1 text-sm">
                          {atts.length === 0 ? (
                            <span className="text-gray-400">無附件</span>
                          ) : (
                            atts.map((att) => (
                              <a
                                key={att.id}
                                href={att.media.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {att.label === 'image' ? '圖片' : 'PDF'}：{att.media.filename}
                              </a>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
