'use client';

import { Input } from './Input';

export type GoogleDriveLinksFieldProps = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export default function GoogleDriveLinksField({
  value,
  onChange,
  disabled = false,
}: GoogleDriveLinksFieldProps) {
  const links = value.length > 0 ? value : [''];

  function updateLink(index: number, nextValue: string) {
    const next = [...links];
    next[index] = nextValue;
    onChange(next);
  }

  function removeLink(index: number) {
    const next = links.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length > 0 ? next : ['']);
  }

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium">Google Drive 檔案連結</legend>
      <p className="text-xs text-gray-500">請確認 Google Drive 設定為「取得連結者可檢視」</p>
      {links.map((link, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id={`google-drive-url-${index}`}
              label={`Google Drive URL ${index + 1}`}
              type="url"
              value={link}
              onChange={(event) => updateLink(index, event.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={disabled}
            />
          </div>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            onClick={() => removeLink(index)}
            disabled={disabled}
            aria-label={`移除第 ${index + 1} 筆檔案連結`}
          >
            移除
          </button>
        </div>
      ))}
      <button
        type="button"
        className="min-h-11 rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={() => onChange([...links, ''])}
        disabled={disabled}
      >
        + 新增檔案連結
      </button>
    </fieldset>
  );
}
