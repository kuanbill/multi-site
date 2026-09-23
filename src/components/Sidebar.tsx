'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const globalMenuItems = [
  { href: '/', label: '儀表板', icon: '📊' },
  { href: '/sites', label: '子網站管理', icon: '🌐' },
  { href: '/users', label: '使用者管理', icon: '👥' },
  { href: '/admin/features', label: '功能選單', icon: '🧩' },
]

interface SiteFeatureLite {
  key: string
  label: string
  icon?: string | null
  path: string
}

interface SidebarProps {
  siteSlug?: string
  siteName?: string
  features?: SiteFeatureLite[]
}

export default function Sidebar({ siteSlug, siteName, features }: SidebarProps) {
  const pathname = usePathname()

  if (siteSlug && features) {
    const featureItems = features.map((f) => ({
      href: `/${siteSlug}/admin/${f.path}`,
      label: f.label,
      icon: f.icon || '•',
    }))
    const siteMenu = [
      { href: `/${siteSlug}/admin`, label: '站點儀表板', icon: '📊' },
      ...featureItems,
      { href: `/${siteSlug}/admin/users`, label: '成員管理', icon: '👥' },
      { href: `/${siteSlug}/admin/settings/features`, label: '功能設定', icon: '⚙️' },
    ]

    return (
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold truncate">{siteName || siteSlug}</h1>
          <p className="text-sm text-gray-400">專案後台</p>
          <Link href="/sites" className="text-xs text-blue-400 hover:underline">
            ← 返回站點清單
          </Link>
        </div>
        <nav className="p-4">
          {siteMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <Link
              href={`/${siteSlug}`}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              <span>🌐</span>
              <span>預覽前台</span>
            </Link>
          </div>
        </nav>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">多子站管理系統</h1>
        <p className="text-sm text-gray-400">都更專案管理後台</p>
      </div>

      <nav className="p-4">
        {globalMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
