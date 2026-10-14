import DeleteSelectionButton from './DeleteSelectionButton';

type SelectionItem = {
  id: number;
  title: string;
  status: string;
  description: string | null;
  attachments: Array<{ id: number; media: { id: number; type: string; filename: string; url: string } }>;
};

export default function SelectionManager({
  siteSlug,
  items,
  canWrite,
  canDelete,
}: {
  siteSlug: string;
  items: SelectionItem[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const statusLabel: Record<string, string> = { draft: '草稿', published: '已發布', archived: '已封存' };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">選配作業</h1>
          <p className="mt-1 text-sm text-gray-600">管理選配說明、文件與圖片。</p>
        </div>
        {canWrite && (
          <a href={`/${siteSlug}/admin/selection/new`} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            新增選配作業
          </a>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {items.length === 0 ? (
          <p className="p-6 text-gray-600">尚無選配作業項目</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{statusLabel[item.status] ?? item.status}</span>
                  </div>
                  {item.description && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{item.description}</p>}
                  <p className="mt-2 text-xs text-gray-500">{item.attachments.length} 個附件</p>
                  {item.attachments.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      {item.attachments.map(({ id, media }) => (
                        <li key={id}>{media.type === 'image' ? '圖片' : '檔案'}：{media.filename}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {(canWrite || canDelete) && (
                  <div className="flex shrink-0 items-center gap-3">
                    {canWrite && <a href={`/${siteSlug}/admin/selection/${item.id}/edit`} className="text-sm text-blue-700 underline">編輯</a>}
                    {canDelete && <DeleteSelectionButton siteSlug={siteSlug} id={item.id} title={item.title} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
