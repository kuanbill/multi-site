import { requireContentPermission } from '@/lib/contentAccess';
import AnnouncementForm from '../AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function NewAnnouncementPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - 新增公告</h2>
      <p className="text-gray-500 mb-6">填寫公告資訊，儲存為草稿或直接發布。</p>
      <AnnouncementForm siteSlug={siteSlug} initial={null} />
    </div>
  );
}
