import { getSiteDashboardStats } from '@/lib/dashboardStats';
import { getSiteBySlug } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const stats = await getSiteDashboardStats(site.id);

  const statCards = [
    { label: '成員數量', value: stats.userCount, icon: '👥' },
    { label: '功能總瀏覽次數', value: stats.totalViews, icon: '👁️' },
    { label: '近 30 日瀏覽', value: stats.recent30DayViews, icon: '📅' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 儀表板</h2>
      <p className="text-gray-500 mb-6">{site.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="font-medium mb-4">各項功能瀏覽次數</h3>
        {stats.siteFeatures.length === 0 ? (
          <p className="text-gray-500 text-sm">此站尚未啟用任何功能。</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.siteFeatures.map((item) => (
              <div key={item.feature.key} className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">
                  {item.feature.icon} {item.feature.label}
                </p>
                <p className="text-xl font-bold">{stats.viewCountByFeature.get(item.feature.key) ?? 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h3 className="font-medium p-4 border-b">最近登入紀錄</h3>
          {stats.recentLogins.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">尚無登入紀錄。</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3">使用者</th>
                  <th className="px-4 py-3">時間</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogins.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="px-4 py-3">
                      {record.user.name}
                      <span className="text-gray-400 ml-2">{record.user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{record.createdAt.toLocaleString('zh-TW')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h3 className="font-medium p-4 border-b">最近瀏覽記錄</h3>
          {stats.recentBrowses.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">尚無已登入使用者的瀏覽記錄。</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3">使用者</th>
                  <th className="px-4 py-3">頁面</th>
                  <th className="px-4 py-3">時間</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBrowses.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="px-4 py-3">{record.user?.name ?? '已刪除帳號'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {stats.labelByKey.get(record.feature) ?? record.feature}
                      <span className="text-gray-400 ml-2">{record.path}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{record.createdAt.toLocaleString('zh-TW')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">快速操作</h3>
        <div className="flex gap-4 flex-wrap">
          <Link href={`/${siteSlug}/admin/users`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            成員管理
          </Link>
          <Link href={`/${siteSlug}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            預覽前台
          </Link>
        </div>
      </div>
    </div>
  );
}
