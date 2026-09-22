import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const [siteCount, userCount, postCount] = await Promise.all([
    prisma.site.count(),
    prisma.user.count(),
    prisma.post.count()
  ])

  const stats = [
    { label: '子網站數量', value: siteCount, icon: '🌐' },
    { label: '使用者數量', value: userCount, icon: '👥' },
    { label: '文章數量', value: postCount, icon: '📝' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">儀表板</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-lg shadow"
          >
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
    </div>
  )
}
