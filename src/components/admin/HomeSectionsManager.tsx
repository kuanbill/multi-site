'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeSectionForm, {
  EMPTY_SECTION,
  type FeatureOption,
  type HomeSectionFormValue,
} from './HomeSectionForm';
import { HOME_SECTION_MAX_COUNT, type HomeSectionSource } from '@/lib/homeSections';

export type HomeSectionRow = {
  id: number;
  sourceType: HomeSectionSource;
  featureId: number | null;
  filter: string;
  title: string | null;
  limit: number;
  showAll: boolean;
  sortOrder: number;
  feature: { id: number; label: string } | null;
};

const SOURCE_LABELS: Record<HomeSectionSource, string> = {
  feature: '自訂功能資料',
  announcement: '最新公告',
  progress: '都更進度',
  page: '頁面',
};

const FILTER_LABELS: Record<string, string> = { current: '僅進行中', all: '全部已發布' };

type Editing = { id: number; value: HomeSectionFormValue } | null;

export default function HomeSectionsManager({
  siteSlug,
  initialSections,
  features,
  canWrite,
}: {
  siteSlug: string;
  initialSections: HomeSectionRow[];
  features: FeatureOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [editing, setEditing] = useState<Editing>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<HomeSectionFormValue>(EMPTY_SECTION);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const atLimit = sections.length >= HOME_SECTION_MAX_COUNT;

  async function callApi(path: string, init: RequestInit): Promise<boolean> {
    setError('');
    setMessage('');
    const response = await fetch(`/api/${siteSlug}/admin/home-sections${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || '操作失敗');
      return false;
    }
    router.refresh();
    return true;
  }

  async function save(value: HomeSectionFormValue, id: number | null) {
    setSaving(true);
    const payload = {
      ...value,
      featureId: value.sourceType === 'feature' ? value.featureId : null,
      title: value.title.trim() || null,
    };
    const ok = await callApi(id === null ? '' : `/${id}`, {
      method: id === null ? 'POST' : 'PATCH',
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (ok) {
      setCreating(false);
      setDraft(EMPTY_SECTION);
      setEditing(null);
      setMessage('已儲存');
    }
  }

  async function remove(section: HomeSectionRow) {
    if (!window.confirm(`確定要刪除「${section.title ?? SOURCE_LABELS[section.sourceType]}」這個區塊嗎？`)) return;
    if (await callApi(`/${section.id}`, { method: 'DELETE' })) setMessage('已刪除');
  }

  async function move(section: HomeSectionRow, offset: -1 | 1) {
    const target = sections.findIndex((row) => row.sortOrder === section.sortOrder + offset);
    const current = sections.findIndex((row) => row.id === section.id);
    if (target < 0 || current < 0) return;

    const reordered = [...sections];
    [reordered[current], reordered[target]] = [reordered[target], reordered[current]];
    setSections(reordered.map((row, index) => ({ ...row, sortOrder: index })));

    const ok = await Promise.all(
      reordered.map((row) =>
        fetch(`/api/${siteSlug}/admin/home-sections/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: row.sortOrder }),
        }).then((response) => response.ok),
      ),
    );
    if (ok.every(Boolean)) {
      setMessage('已調整順序');
      router.refresh();
    } else {
      setError('順序調整失敗，請重新整理後再試');
      router.refresh();
    }
  }

  async function addDefaults() {
    setSaving(true);
    const response = await fetch(`/api/${siteSlug}/admin/home-sections/defaults`, { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(result.error || '加入預設區塊失敗');
      return;
    }
    setMessage(result.added > 0 ? `已加入 ${result.added} 個預設區塊` : '預設區塊已全部存在');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">首頁資料區塊</h3>
            <p className="text-sm text-gray-500 mt-1">
              依序顯示在首頁主圖下方，目前 {sections.length} / {HOME_SECTION_MAX_COUNT} 個。
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addDefaults}
                disabled={saving}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                一鍵加入預設區塊
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(true);
                  setDraft(EMPTY_SECTION);
                  setEditing(null);
                  setError('');
                }}
                disabled={atLimit || creating || editing !== null}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                新增區塊
              </button>
            </div>
          )}
        </div>

        {atLimit && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-4">
            已達 {HOME_SECTION_MAX_COUNT} 個上限，請先刪除不需要的區塊。
          </p>
        )}

        {sections.length === 0 && !creating && (
          <p className="text-sm text-gray-500 mt-4">尚未設定區塊，可手動新增或一鍵加入預設區塊。</p>
        )}

        <ul className="mt-4 space-y-3">
          {sections.map((section, index) => (
            <li key={section.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{section.title ?? SOURCE_LABELS[section.sourceType]}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {SOURCE_LABELS[section.sourceType]}
                    {section.sourceType === 'feature' && section.feature ? `：${section.feature.label}` : ''}
                    {section.sourceType === 'progress' ? `：${FILTER_LABELS[section.filter] ?? section.filter}` : ''}
                    {` · ${section.limit} 筆`}
                    {section.showAll ? '' : ' · 不顯示查看全部'}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => move(section, -1)}
                      disabled={index === 0}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                      aria-label="上移"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(section, 1)}
                      disabled={index === sections.length - 1}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                      aria-label="下移"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
onClick={() => {
                          setDraft(EMPTY_SECTION);
                          setEditing({
                            id: section.id,
                            value: {
                              sourceType: section.sourceType,
                              featureId: section.featureId,
                              filter: (section.filter as HomeSectionFormValue['filter']) || 'all',
                              title: section.title ?? '',
                              limit: section.limit,
                              showAll: section.showAll,
                            },
                          });
                          setError('');
                        }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(section)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      刪除
                    </button>
                  </div>
                )}
              </div>

              {editing?.id === section.id && (
                <div className="mt-4 border-t pt-4">
                  <HomeSectionForm
                    value={editing.value}
                    features={features}
                    error={error}
                    saving={saving}
                    submitLabel="儲存區塊"
                    onChange={(value) => setEditing({ id: section.id, value })}
                    onSubmit={() => save(editing.value, section.id)}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        {creating && (
          <div className="mt-4 border-t pt-4">
            <HomeSectionForm
              value={draft}
              features={features}
              error={error}
              saving={saving}
              submitLabel="新增區塊"
              onChange={setDraft}
              onSubmit={() => save(draft, null)}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {message && !error && <p className="text-sm text-gray-600 mt-4">{message}</p>}
      </div>
    </div>
  );
}