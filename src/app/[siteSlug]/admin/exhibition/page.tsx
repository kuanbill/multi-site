import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import ExhibitionForm from './ExhibitionForm';
import DeleteExhibitionButton from './DeleteButton';

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

export default async function ExhibitionAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.exhibition.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });

  const canWrite = canPerformContentAction(context.siteRole, 'write');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{context.site.name} - 公開展覽</h2>
          <p className="text-gray-500">管理展覽日期、地點與圖庫附件，日期範圍需正確。</p>
        </div>
      </div>

      {canWrite && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">新增展覽</h3>
          <ExhibitionForm siteSlug={siteSlug} initial={null} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">展覽列表</h3>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-gray-500">尚無展覽</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {statusBadge(item.status)}
                    <span className="text-sm text-gray-500">
                      {item.startDate ? new Date(item.startDate).toLocaleDateString('zh-TW') : ''}{item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString('zh-TW')}` : ''}
                    </span>
                  </div>
                  <p className="font-medium mt-1">{item.title}</p>
                  <p className="text-xs text-gray-500">slug: {item.slug} {item.location ? `| 地點：${item.location}` : ''}</p>
                  {item.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>}
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer hover:underline">編輯</summary>
                      <div className="mt-2">
                        <ExhibitionForm siteSlug={siteSlug} initial={item} />
                      </div>
                    </details>
                    <DeleteExhibitionButton siteSlug={siteSlug} id={item.id} />
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
