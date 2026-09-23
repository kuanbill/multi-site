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
      <p className="text-gray-500 mb-4">系統功能不可刪除，僅可新增自訂功能供各專案選用。</p>
      <FeatureClient initial={features} />
    </div>
  );
}
