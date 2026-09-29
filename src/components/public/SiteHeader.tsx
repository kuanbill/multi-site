'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={`/${siteSlug}`} className="font-bold text-lg">
          {siteName}
        </Link>
        <nav className="hidden md:flex gap-4">
          {navigationFeatures.map((f) => (
            <Link
              key={f.key}
              href={`/${siteSlug}/${f.path}`}
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100"
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
      {open && (
        <nav className="md:hidden border-t bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex flex-col">
            {navigationFeatures.map((f) => (
              <Link
                key={f.key}
                href={`/${siteSlug}/${f.path}`}
                className="py-2 text-sm text-gray-600 hover:text-blue-600"
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
