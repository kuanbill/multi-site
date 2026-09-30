'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

const PRESETS = [
  { name: '藍', primaryColor: '#2563eb', accentColor: '#1d4ed8' },
  { name: '綠', primaryColor: '#059669', accentColor: '#047857' },
  { name: '紅', primaryColor: '#e11d48', accentColor: '#be123c' },
  { name: '琥珀', primaryColor: '#d97706', accentColor: '#b45309' },
  { name: '紫', primaryColor: '#7c3aed', accentColor: '#6d28d9' },
  { name: '灰藍', primaryColor: '#475569', accentColor: '#334155' },
];

function normalizeHex(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <input
        type="color"
        value={normalizeHex(value) ?? '#000000'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border border-gray-300 p-0.5 disabled:opacity-50"
        aria-label={label}
      />
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#2563eb"
        className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm font-mono disabled:bg-gray-100"
      />
    </div>
  );
}

export default function AppearanceClient({
  siteSlug,
  initial,
  canManageSettings,
}: {
  siteSlug: string;
  initial: { primaryColor: string; accentColor: string };
  canManageSettings: boolean;
}) {
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const previewPrimary = normalizeHex(primaryColor) ?? '#2563eb';
  const previewAccent = normalizeHex(accentColor) ?? '#1d4ed8';

  async function save() {
    const primary = normalizeHex(primaryColor);
    const accent = normalizeHex(accentColor);
    if (!primary || !accent) {
      setMsg('色碼格式錯誤，需使用 #rrggbb 格式');
      return;
    }
    setSaving(true);
    setMsg('');
    const res = await fetch(`/api/${siteSlug}/admin/appearance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryColor: primary, accentColor: accent }),
    });
    if (res.ok) {
      setPrimaryColor(primary);
      setAccentColor(accent);
      setMsg('已儲存');
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error || '儲存失敗');
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      {!canManageSettings && (
        <p className="mb-4 text-sm text-amber-700">您只有檢視權限，請聯絡站點管理員修改外觀設定。</p>
      )}

      <div className="space-y-4">
        <ColorRow
          label="主色"
          hint="頁首背景、按鈕、連結"
          value={primaryColor}
          onChange={setPrimaryColor}
          disabled={!canManageSettings}
        />
        <ColorRow
          label="輔色"
          hint="標題強調、次要元素"
          value={accentColor}
          onChange={setAccentColor}
          disabled={!canManageSettings}
        />
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium mb-2">配色範例</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={!canManageSettings}
              onClick={() => {
                setPrimaryColor(preset.primaryColor);
                setAccentColor(preset.accentColor);
              }}
              className="flex items-center gap-1.5 rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primaryColor }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accentColor }} />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium mb-2">預覽</p>
        <div
          className="rounded-lg border overflow-hidden"
          style={
            {
              '--site-primary': previewPrimary,
              '--site-accent': previewAccent,
            } as CSSProperties
          }
        >
          <div className="bg-primary text-white px-4 h-12 flex items-center justify-between">
            <span className="font-bold">網站名稱</span>
            <span className="text-sm text-white/90">首頁 / 公告 / 進度</span>
          </div>
          <div className="p-4 bg-gray-50 space-y-2">
            <p className="text-sm text-primary">連結文字範例</p>
            <p className="text-sm text-accent">強調文字範例</p>
            <div className="flex gap-2 pt-1">
              <span className="bg-primary text-white px-3 py-1.5 rounded text-sm">按鈕範例</span>
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded text-sm">次要按鈕</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !canManageSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
