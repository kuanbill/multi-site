import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import FeatureClient from './FeatureClient';

export const dynamic = 'force-dynamic';

export default async function AdminFeaturesPage() {
  if (!(await getAdminSession())) redirect('/');
  const features = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">功能選單管理</h2>
      <p className="text-gray-500 mb-4">功能項目可由各子網站分別啟用；刪除功能會同時移除各子網站的相關設定。</p>
      <FeatureClient initial={features} />
    </div>
  );
}
