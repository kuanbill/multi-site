'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar, { type SiteFeatureLite } from '@/components/Sidebar'

interface AdminUser {
  name?: string | null
  email?: string | null
  role?: string | null
}

interface AdminShellProps {
  children: React.ReactNode
  user: AdminUser
  siteSlug?: string
  siteName?: string
  features?: SiteFeatureLite[]
}

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed'

export function isNestedSiteAdminPath(pathname: string | null) {
  return Boolean(pathname?.startsWith('/admin/sites/') && pathname !== '/admin/sites/new')
}

export default function AdminShell({
  children,
  user,
  siteSlug,
  siteName,
  features,
}: AdminShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
    } finally {
      setStorageReady(true)
    }
  }, [])

  useEffect(() => {
    if (storageReady) window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed, storageReady])

  useEffect(() => {
    if (!mobileOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileMenu()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  function closeMobileMenu() {
    setMobileOpen(false)
    window.requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  if (!siteSlug && isNestedSiteAdminPath(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        siteSlug={siteSlug}
        siteName={siteName}
        features={features}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileMenu}
      />
      <div className={`ml-0 transition-[margin] duration-150 motion-reduce:transition-none ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header
          user={user}
          siteName={siteName}
          onMenuToggle={() => setMobileOpen((value) => !value)}
          mobileOpen={mobileOpen}
          menuButtonRef={menuButtonRef}
        />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
