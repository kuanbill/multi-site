'use client'

import { signOut } from 'next-auth/react'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  siteName?: string
}

export default function Header({ user, siteName }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div>{siteName && <span className="text-sm text-gray-500">{siteName}</span>}</div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-gray-500">{user.role === 'admin' ? '管理員' : '編輯者'}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          登出
        </button>
      </div>
    </header>
  )
}
