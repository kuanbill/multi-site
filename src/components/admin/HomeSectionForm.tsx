'use client';

import { Select, NumberInput, TextArea, Checkbox } from '@/components/admin';
import {
  HOME_SECTION_LIMITS,
  HOME_SECTION_SOURCES,
  PROGRESS_SECTION_FILTERS,
  type HomeSectionSource,
  type ProgressSectionFilter,
} from '@/lib/homeSections';

export type FeatureOption = { id: number; label: string; key: string };

export type HomeSectionFormValue = {
  sourceType: HomeSectionSource;
  featureId: number | null;
  filter: ProgressSectionFilter;
  title: string;
  limit: number;
  showAll: boolean;
};

export const EMPTY_SECTION: HomeSectionFormValue = {
  sourceType: 'announcement',
  featureId: null,
  filter: 'all',
  title: '',
  limit: 3,
  showAll: true,
};

const SOURCE_LABELS: Record<HomeSectionSource, string> = {
  feature: '自訂功能資料',
  announcement: '最新公告',
  progress: '都更進度',
  page: '頁面',
};

const FILTER_LABELS: Record<ProgressSectionFilter, string> = {
  current: '僅進行中',
  all: '全部已發布',
};

export default function HomeSectionForm({
  value,
  features,
  error,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  value: HomeSectionFormValue;
  features: FeatureOption[];
  error: string;
  onChange: (value: HomeSectionFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  const isFeature = value.sourceType === 'feature';
  const isProgress = value.sourceType === 'progress';

  function changeSource(sourceType: HomeSectionSource) {
    onChange({
      ...value,
      sourceType,
      // 非 feature 來源不得帶功能項；進度以外不保留篩選。
      featureId: sourceType === 'feature' ? value.featureId : null,
      filter: sourceType === 'progress' ? value.filter : 'all',
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="資料來源"
          value={value.sourceType}
          onChange={(event) => changeSource(event.target.value as HomeSectionSource)}
          options={HOME_SECTION_SOURCES.map((source) => ({ value: source, label: SOURCE_LABELS[source] }))}
          required
        />

        {isFeature ? (
          <Select
            label="功能項"
            value={value.featureId === null ? '' : String(value.featureId)}
            onChange={(event) => onChange({ ...value, featureId: event.target.value ? Number(event.target.value) : null })}
            placeholder="請選擇功能項"
            options={features.map((feature) => ({ value: String(feature.id), label: feature.label }))}
            hint="此區塊會顯示該功能項下的資料。"
            required
          />
        ) : isProgress ? (
          <Select
            label="顯示範圍"
            value={value.filter}
            onChange={(event) => onChange({ ...value, filter: event.target.value as ProgressSectionFilter })}
            options={PROGRESS_SECTION_FILTERS.map((filter) => ({ value: filter, label: FILTER_LABELS[filter] }))}
          />
        ) : null}

        <NumberInput
          label="顯示筆數"
          value={value.limit}
          min={HOME_SECTION_LIMITS.min}
          max={HOME_SECTION_LIMITS.max}
          onChange={(event) => onChange({ ...value, limit: Number(event.target.value) })}
          hint={`介於 ${HOME_SECTION_LIMITS.min} 與 ${HOME_SECTION_LIMITS.max} 筆`}
          required
        />

        <div className="flex items-end pb-2">
          <Checkbox
            label="顯示「查看全部」連結"
            checked={value.showAll}
            onChange={(event) => onChange({ ...value, showAll: event.target.checked })}
          />
        </div>
      </div>

      <TextArea
        label="區塊標題"
        value={value.title}
        rows={2}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
        hint="留空時使用來源預設標題。"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:underline">
          取消
        </button>
      </div>
    </form>
  );
}