'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getSiteAdminFeatureLinks } from '@/lib/features'

const globalMenuItems = [
  { href: '/admin', label: '儀表板', icon: '📊' },
  { href: '/admin/sites', label: '子網站管理', icon: '🌐' },
  { href: '/admin/users', label: '使用者管理', icon: '👥' },
  { href: '/admin/features', label: '功能選單', icon: '🧩' },
]

export interface SiteFeatureLite {
  key: string
  label: string
  icon?: string | null
  path: string
}

interface SidebarProps {
  siteSlug?: string
  siteName?: string
  features?: SiteFeatureLite[]
  collapsed?: boolean
  onToggle?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({
  siteSlug,
  siteName,
  features,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const asideRef = useRef<HTMLElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)
  const [mobileViewport, setMobileViewport] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const updateViewport = () => setMobileViewport(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (!mobileOpen || !mobileViewport) return
    mobileCloseRef.current?.focus()

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !asideRef.current) return
      const focusable = Array.from(
        asideRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [mobileOpen, mobileViewport])

  const renderToggle = () => onToggle && (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'}
      title={collapsed ? '展開側邊欄' : '收合側邊欄'}
      className="hidden min-h-10 min-w-10 items-center justify-center rounded-lg text-lg text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 lg:flex"
    >
      <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
    </button>
  )

  const renderMobileClose = () => onMobileClose && (
    <button
      ref={mobileCloseRef}
      type="button"
      onClick={onMobileClose}
      aria-label="關閉側邊欄"
      title="關閉側邊欄"
      className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-lg text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 lg:hidden"
    >
      <span aria-hidden="true">✕</span>
    </button>
  )

  const renderNavItem = (item: { href: string; label: string; icon: string }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onMobileClose}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={`flex items-center rounded-lg py-3 mb-2 transition-[background-color] duration-150 ${
        collapsed ? 'justify-center px-2' : 'gap-3 px-4'
      } ${pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
    >
      <span aria-hidden="true">{item.icon}</span>
      <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
    </Link>
  )

  const mobileBackdrop = mobileOpen && onMobileClose && (
    <button
      type="button"
      aria-label="關閉側邊欄"
      onClick={onMobileClose}
      className="fixed inset-0 z-30 bg-black/40 lg:hidden"
    />
  )

  const drawerClass = `fixed left-0 top-0 z-40 h-full transform bg-gray-900 text-white transition-[transform,width] duration-150 motion-reduce:transition-none lg:translate-x-0 ${
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  } ${collapsed ? 'w-20' : 'w-64'}`

  if (siteSlug && features) {
    const featureItems = [
      { href: `/admin/sites/${siteSlug}/home`, label: '首頁設定', icon: '🏠' },
      ...getSiteAdminFeatureLinks(siteSlug, features),
    ]
    const siteMenu = [
      { href: `/admin/sites/${siteSlug}`, label: '站點儀表板', icon: '📊' },
      ...featureItems,
      { href: `/admin/sites/${siteSlug}/media`, label: '媒體庫', icon: '📁' },
      { href: `/admin/sites/${siteSlug}/users`, label: '成員管理', icon: '👥' },
      { href: `/admin/sites/${siteSlug}/settings/features`, label: '功能設定', icon: '⚙️' },
      { href: `/admin/sites/${siteSlug}/settings/appearance`, label: '外觀設定', icon: '🎨' },
    ]

    return (
      <>
        {mobileBackdrop}
        <aside
          ref={asideRef}
          id="admin-sidebar"
          aria-label="主要導覽"
          aria-hidden={mobileViewport && !mobileOpen ? true : undefined}
          inert={mobileViewport && !mobileOpen ? true : undefined}
          className={`${drawerClass} overflow-y-auto`}
        >
        <div className={`border-b border-gray-800 ${collapsed ? 'p-3' : 'p-4'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <h1 className={collapsed ? 'sr-only' : 'truncate text-xl font-bold'}>{siteName || siteSlug}</h1>
            {renderToggle()}
            {renderMobileClose()}
          </div>
          {!collapsed && <p className="text-sm text-gray-400">專案後台</p>}
          <Link
            href="/admin/sites"
            onClick={onMobileClose}
            title={collapsed ? '返回站點清單' : undefined}
            aria-label={collapsed ? '返回站點清單' : undefined}
            className={`text-xs text-blue-400 hover:underline ${collapsed ? 'sr-only' : ''}`}
          >
            ← 返回站點清單
          </Link>
        </div>
        <nav className={collapsed ? 'p-3' : 'p-4'}>
          {siteMenu.map(renderNavItem)}
          <div className={`mt-4 border-t border-gray-800 pt-4 ${collapsed ? 'flex justify-center' : ''}`}>
            <Link
              href={`/${siteSlug}`}
              onClick={onMobileClose}
              title={collapsed ? '預覽前台' : undefined}
              aria-label={collapsed ? '預覽前台' : undefined}
              className={`flex items-center py-2 text-sm text-gray-400 hover:text-white ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}
            >
              <span aria-hidden="true">🌐</span>
              <span className={collapsed ? 'sr-only' : undefined}>預覽前台</span>
            </Link>
          </div>
        </nav>
        </aside>
      </>
    )
  }

  return (
    <>
      {mobileBackdrop}
      <aside
        ref={asideRef}
        id="admin-sidebar"
        aria-label="主要導覽"
        aria-hidden={mobileViewport && !mobileOpen ? true : undefined}
        inert={mobileViewport && !mobileOpen ? true : undefined}
        className={drawerClass}
      >
      <div className={`border-b border-gray-800 ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          <h1 className={collapsed ? 'sr-only' : 'text-xl font-bold'}>多子站管理系統</h1>
          {renderToggle()}
          {renderMobileClose()}
        </div>
        {!collapsed && <p className="text-sm text-gray-400">都更專案管理後台</p>}
      </div>

      <nav className={collapsed ? 'p-3' : 'p-4'}>
        {globalMenuItems.map(renderNavItem)}
      </nav>
      </aside>
    </>
  )
}
