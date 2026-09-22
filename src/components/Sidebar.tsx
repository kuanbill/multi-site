'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/', label: '儀表板', icon: '📊' },
  { href: '/sites', label: '子網站管理', icon: '🌐' },
  { href: '/users', label: '使用者管理', icon: '👥' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">多子站管理系統</h1>
        <p className="text-sm text-gray-400">都更專案管理後台</p>
      </div>

      <nav className="p-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
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
