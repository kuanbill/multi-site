import Link from 'next/link';
import { getPublicNavigationFeatures } from '@/lib/site';

interface Props {
  siteSlug: string;
  siteName: string;
  features: { key: string; label: string; path: string; icon?: string | null; enabled: boolean; sortOrder: number }[];
}

export default function SiteHeader({ siteSlug, siteName, features }: Props) {
  const navigationFeatures = getPublicNavigationFeatures(features);
  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={`/${siteSlug}`} className="font-bold text-lg">
          {siteName}
        </Link>
        <nav className="flex gap-4">
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
      </div>
    </header>
  );
}
