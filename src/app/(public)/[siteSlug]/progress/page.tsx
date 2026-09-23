import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

function progressStatusLabel(status: string) {
  const map: Record<string, string> = {
    completed: '已完成',
    current: '進行中',
    upcoming: '待辦',
  };
  return map[status] ?? status;
}

function progressStatusStyle(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-gray-100 text-gray-600 border-gray-300',
    current: 'bg-blue-600 text-white border-blue-600',
    upcoming: 'bg-white text-orange-600 border-orange-300',
  };
  return map[status] ?? 'bg-white text-gray-600 border-gray-300';
}

export default async function PublicProgressPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'progress');

  const items = await prisma.progressItem.findMany({
    where: { siteId: site.id, status: 'published' },
    orderBy: [{ stageDate: 'asc' }, { sortOrder: 'asc' }],
  });

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-2">都更進度</h1>
        <p className="text-gray-500">{site.name} 階段時間軸</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {items.length === 0 ? (
          <p className="text-gray-500">尚無進度</p>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
            {items.map((item) => (
              <div key={item.id} className="relative pl-8">
                <span
                  className={`absolute left-0 top-1 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${progressStatusStyle(item.progressStatus)}`}
                />
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs border ${progressStatusStyle(item.progressStatus)}`}>
                    {progressStatusLabel(item.progressStatus)}
                    {item.progressStatus === 'current' ? ' ●' : ''}
                  </span>
                  <span className="text-sm text-gray-500">{new Date(item.stageDate).toLocaleDateString('zh-TW')}</span>
                </div>
                <h3 className="font-bold">
                  {item.stageLabel} - {item.title}
                </h3>
                {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
                {item.content && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{item.content}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
