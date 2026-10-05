'use client';

import { useState } from 'react';
import Link from 'next/link';
import InstallAppButton from '@/components/InstallAppButton';

interface Props {
  siteSlug: string;
  siteName: string;
  features: { key: string; label: string; path: string; icon?: string | null; enabled: boolean; sortOrder: number }[];
}

export default function SiteHeader({ siteSlug, siteName, features }: Props) {
  const [open, setOpen] = useState(false);
  const navigationFeatures = [...features]
    .filter((f) => f.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={`/${siteSlug}`} className="font-bold text-lg text-white">
          {siteName}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="hidden md:flex gap-4">
            {navigationFeatures.map((f) => (
              <Link
                key={f.key}
                href={`/${siteSlug}/${f.path}`}
                className="text-sm text-white/90 hover:text-white"
              >
                {f.label}
              </Link>
            ))}
          </nav>
          <InstallAppButton tone="light" />
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10"
            aria-expanded={open}
            aria-label={open ? '關閉選單' : '開啟選單'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-white/20 bg-primary">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex flex-col">
            {navigationFeatures.map((f) => (
              <Link
                key={f.key}
                href={`/${siteSlug}/${f.path}`}
                className="py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded px-2"
                onClick={closeMenu}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
