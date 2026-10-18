import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import VendorForm from './VendorForm';
import DeleteVendorButton from './DeleteButton';

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

export default async function VendorAdminPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.vendor.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: { logoMedia: true },
  });

  const canWrite = canPerformContentAction(context.siteRole, 'write');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{context.site.name} - 協力廠商</h2>
          <p className="text-gray-500">管理廠商名稱、分類、服務與契約文件。</p>
        </div>
      </div>

      {canWrite && (
        <div className="mb-8">
          <h3 className="font-medium mb-4">新增廠商</h3>
          <VendorForm siteSlug={siteSlug} initial={null} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">廠商列表</h3>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-gray-500">尚無廠商</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 flex gap-4">
                  {item.logoMedia?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logoMedia.url} alt={item.name} className="w-16 h-16 object-cover rounded border" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{item.category}</span>
                      {statusBadge(item.status)}
                    </div>
                    {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
                    {(item.contactName || item.contactPhone || item.contactEmail) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {[item.contactName, item.contactPhone, item.contactEmail].filter(Boolean).join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer hover:underline">編輯</summary>
                      <div className="mt-2">
                        <VendorForm siteSlug={siteSlug} initial={item} />
                      </div>
                    </details>
                    <DeleteVendorButton siteSlug={siteSlug} id={item.id} />
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
