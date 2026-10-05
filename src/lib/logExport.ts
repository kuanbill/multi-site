export type LogType = 'logins' | 'views';

export type LoginLogRow = { name: string | null; email: string; createdAt: Date };
export type ViewLogRow = { user: string | null; featureLabel: string; path: string; createdAt: Date };

const BOM = '\uFEFF';
const LINE_BREAK = '\r\n';

export function parseLogType(value: unknown): LogType | null {
  return value === 'logins' || value === 'views' ? value : null;
}

/** 時間以伺服器當地時間輸出，避免 Excel 把 ISO 字串轉成不同時區。 */
export function formatLogTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 所有欄位都加引號，逗號、引號、換行才不會破壞欄位。 */
function csvRow(values: Array<string | null | undefined>): string {
  return values
    .map((value) => `"${(value ?? '').replace(/"/g, '""')}"`)
    .join(',');
}

/** 帶 BOM 的 CSV，Excel 直接開啟中文欄名不會亂碼。 */
export function buildLoginLogCsv(rows: LoginLogRow[]): string {
  const lines = [csvRow(['登入時間', '使用者名稱', '電子郵件'])];
  for (const row of rows) {
    lines.push(csvRow([formatLogTime(row.createdAt), row.name, row.email]));
  }
  return `${BOM}${lines.join(LINE_BREAK)}${LINE_BREAK}`;
}

export function buildViewLogCsv(rows: ViewLogRow[]): string {
  const lines = [csvRow(['瀏覽時間', '使用者', '功能', '路徑'])];
  for (const row of rows) {
    lines.push(csvRow([formatLogTime(row.createdAt), row.user, row.featureLabel, row.path]));
  }
  return `${BOM}${lines.join(LINE_BREAK)}${LINE_BREAK}`;
}

export function logExportFilename(type: LogType, siteSlug: string): string {
  return type === 'logins' ? `logins-${siteSlug}.csv` : `views-${siteSlug}.csv`;
}
