export type HomeFormValues = {
  tagline: string | null;
  intro: string | null;
  heroMediaId: number | null;
  currentStage: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
};

/** 空字串與 null 對文字欄位意義相同，避免使用者只改了空白就出現「未儲存」。 */
function normalizeText(value: string | number | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 表單是否有尚未寫回資料庫的變更；主圖與文字欄位都納入比較。 */
export function isHomeFormDirty(values: HomeFormValues, initial: HomeFormValues): boolean {
  if (values.heroMediaId !== initial.heroMediaId) return true;
  const textFields: (keyof HomeFormValues)[] = [
    'tagline',
    'intro',
    'currentStage',
    'contactName',
    'contactPhone',
    'contactEmail',
    'contactAddress',
  ];
  return textFields.some((field) => normalizeText(values[field]) !== normalizeText(initial[field]));
}

/**
 * 主圖狀態說明。上傳只會寫進媒體池，必須再按儲存才會成為首頁主圖，
 * 因此選圖當下要明確提示「尚未儲存」，避免誤以為上傳失敗。
 */
export function buildHeroSaveHint({ heroMediaId, dirty }: { heroMediaId: number | null; dirty: boolean }): string {
  if (heroMediaId === null) return '尚未設定主圖，儲存後首頁也不會顯示圖片。';
  return dirty
    ? '已選取主圖，按「儲存首頁設定」後才會顯示於首頁。'
    : '主圖已儲存，儲存時機為剛才的上傳。';
}