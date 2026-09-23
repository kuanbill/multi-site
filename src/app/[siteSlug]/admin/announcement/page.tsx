import Link from 'next/link';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import DeleteAnnouncementButton from './DeleteButton';

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

export default async function AnnouncementListPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.announcement.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{context.site.name} - 公告欄</h2>
          <p className="text-gray-500">管理站點公告的草稿與發布狀態。</p>
        </div>
        <Link href={`/${siteSlug}/admin/announcement/new`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增公告
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-gray-500">尚無公告</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3">標題</th>
                <th className="px-4 py-3">識別碼</th>
                <th className="px-4 py-3">分類</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">更新時間</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.pinned && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">置頂</span>}
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {item.summary && <p className="text-xs text-gray-500 truncate max-w-xs">{item.summary}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.slug}</td>
                  <td className="px-4 py-3">{item.category ?? '-'}</td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(item.updatedAt).toLocaleDateString('zh-TW')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/${siteSlug}/admin/announcement/${item.id}/edit`} className="text-blue-600 hover:underline">
                        編輯
                      </Link>
                      <DeleteAnnouncementButton siteSlug={siteSlug} id={item.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
