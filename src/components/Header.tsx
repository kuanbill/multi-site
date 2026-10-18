'use client'

import { signOut } from 'next-auth/react'
import InstallAppButton from '@/components/InstallAppButton'
import { roleLabel } from '@/lib/roles'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  siteName?: string
  onMenuToggle?: () => void
  mobileOpen?: boolean
  menuButtonRef?: React.RefObject<HTMLButtonElement | null>
}

export default function Header({ user, siteName, onMenuToggle, mobileOpen = false, menuButtonRef }: HeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuToggle && (
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenuToggle}
            aria-label={mobileOpen ? '關閉側邊欄' : '開啟側邊欄'}
            title={mobileOpen ? '關閉側邊欄' : '開啟側邊欄'}
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
          >
            <span aria-hidden="true">☰</span>
          </button>
        )}
        {siteName && <span className="truncate text-sm text-gray-500">{siteName}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <InstallAppButton tone="dark" className="hidden sm:inline-flex" />

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-gray-500">{user.role ? roleLabel(user.role) : ''}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="min-h-10 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-4"
        >
          登出
        </button>
      </div>
    </header>
  )
}
