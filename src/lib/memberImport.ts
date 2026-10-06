import ExcelJS from 'exceljs';
import { randomInt } from 'node:crypto';

export const TEMPLATE_SHEET_NAME = '成員匯入';
export const INSTRUCTIONS_SHEET_NAME = '填寫說明';

export const MEMBER_TEMPLATE_HEADERS = ['Email', '姓名', '手機'] as const;

export type MemberRowInput = {
  rowNumber: number;
  email: string;
  name: string;
  phone: string;
};

export type MemberRowIssue = {
  rowNumber: number;
  email: string;
  reason: string;
};

export type SheetRow = { rowNumber: number; values: unknown[] };

export type ParsedMemberRows = {
  headerError?: string;
  entries: MemberRowInput[];
  errors: MemberRowIssue[];
};

export type ImportCreatedRow = {
  email: string;
  name: string;
  phone: string;
  password: string;
  generated: boolean;
};

export type ImportSkippedRow = { email: string; reason: string };

export type ImportResult = {
  created: ImportCreatedRow[];
  skipped: ImportSkippedRow[];
  errors: MemberRowIssue[];
};

export const TEMPLATE_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL_CHARS = LETTERS + DIGITS;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\- ]{6,20}$/;
const MAX_ROWS = 1000;

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

/** 6 碼英數混合（至少含一個英文字母與一個數字），排除易混淆字元 0/O/1/I/l。 */
export function generateTempPassword(): string {
  const chars: string[] = [];
  for (let i = 0; i < 6; i += 1) chars.push(pick(ALL_CHARS));
  if (!chars.some((c) => LETTERS.includes(c))) chars[0] = pick(LETTERS);
  if (!chars.some((c) => DIGITS.includes(c))) chars[1] = pick(DIGITS);
  return chars.join('');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'object') {
    const obj = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (Array.isArray(obj.richText)) return obj.richText.map((t) => t.text ?? '').join('').trim();
    if (typeof obj.text === 'string') return obj.text.trim();
    if (typeof obj.result === 'string') return obj.result.trim();
    if (typeof obj.result === 'number') return String(obj.result);
  }
  return '';
}

function findHeaderColumns(rows: SheetRow[]): {
  headerRowNumber: number;
  email: number;
  name: number;
  phone: number | null;
} | null {
  for (const row of rows) {
    const cells = row.values.map(cellText);
    const emailIndex = cells.findIndex((c) => c.toLowerCase() === 'email');
    if (emailIndex === -1) continue;
    const nameIndex = cells.findIndex((c) => c === '姓名');
    if (nameIndex === -1) continue;
    const phoneIndex = cells.findIndex((c) => c === '手機');
    return {
      headerRowNumber: row.rowNumber,
      email: emailIndex,
      name: nameIndex,
      phone: phoneIndex === -1 ? null : phoneIndex,
    };
  }
  return null;
}

export function parseMemberRows(rows: SheetRow[]): ParsedMemberRows {
  const columns = findHeaderColumns(rows);
  if (!columns) {
    return {
      headerError: '找不到標題列，請使用「下載範本」取得的檔案填寫（標題需含 Email、姓名）',
      entries: [],
      errors: [],
    };
  }

  const entries: MemberRowInput[] = [];
  const errors: MemberRowIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.rowNumber <= 0 || row.rowNumber === columns.headerRowNumber) continue;
    const cells = row.values.map(cellText);
    const email = cellText(cells[columns.email]).toLowerCase();
    const name = cellText(cells[columns.name]);
    const phone = columns.phone === null ? '' : cellText(cells[columns.phone]);
    if (!email && !name && !phone) continue;

    if (!email) {
      errors.push({ rowNumber: row.rowNumber, email: '', reason: '缺少 Email' });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ rowNumber: row.rowNumber, email, reason: 'Email 格式不正確' });
      continue;
    }
    if (!name) {
      errors.push({ rowNumber: row.rowNumber, email, reason: '缺少姓名' });
      continue;
    }
    if (phone && !PHONE_RE.test(phone)) {
      errors.push({ rowNumber: row.rowNumber, email, reason: '手機格式不正確（限 6-20 碼數字與 +()-' });
      continue;
    }
    if (seen.has(email)) {
      errors.push({ rowNumber: row.rowNumber, email, reason: '檔案內 Email 重複' });
      continue;
    }
    seen.add(email);
    if (entries.length >= MAX_ROWS) {
      errors.push({ rowNumber: row.rowNumber, email, reason: `單次最多匯入 ${MAX_ROWS} 筆` });
      continue;
    }
    entries.push({ rowNumber: row.rowNumber, email, name, phone });
  }

  return { entries, errors };
}

export async function readMemberWorkbook(buffer: Buffer | Uint8Array): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) throw new Error('工作表不存在');
  const rows: SheetRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = (row.values as unknown[]).slice(1);
    rows.push({ rowNumber, values });
  });
  return rows;
}

export async function buildTemplateWorkbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);
  sheet.columns = MEMBER_TEMPLATE_HEADERS.map((h) => ({ width: Math.max(14, h.length * 4 + 8) }));
  const headerRow = sheet.addRow([...MEMBER_TEMPLATE_HEADERS]);
  headerRow.font = { bold: true };

  const notes = workbook.addWorksheet(INSTRUCTIONS_SHEET_NAME);
  [
    '成員匯入範本填寫說明',
    '',
    '1. 請保留第一頁「成員匯入」的標題列（Email、姓名、手機），資料請填在標題列下方。',
    '2. Email、姓名為必填；手機選填（限 6-20 碼數字與 +()-空白）。',
    '3. 匯入角色一律預設為「檢視者」，匯入後可於成員列表調整。',
    '4. 密碼由系統自動產生 6 碼英數，匯入結果會列出各成員密碼，並可下載結果檔轉發。',
    '5. 每個 Email 只能屬於一個子網站；已屬其他專案的帳號會列為失敗，不會被搬移。',
    '6. 已是本站成員的 Email 會自動略過，不會重複建立。',
    '7. 一頁最多 1000 筆。',
  ].forEach((line) => notes.addRow([line]));
  notes.getColumn(1).width = 100;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBufferLike);
}

export async function buildResultWorkbookBuffer(result: ImportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('匯入結果');
  const headerRow = sheet.addRow(['狀態', 'Email', '姓名', '手機', '密碼', '說明']);
  headerRow.font = { bold: true };

  for (const row of result.created) {
    sheet.addRow([
      '新增成功',
      row.email,
      row.name,
      row.phone,
      row.generated ? row.password : '沿用原密碼',
      row.generated ? '角色：檢視者' : '角色：檢視者（既有帳號）',
    ]);
  }
  for (const row of result.skipped) sheet.addRow(['略過', row.email, '', '', '', row.reason]);
  for (const row of result.errors) {
    sheet.addRow([`失敗（第 ${row.rowNumber} 列）`, row.email, '', '', '', row.reason]);
  }
  sheet.columns = [{ width: 18 }, { width: 30 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 46 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBufferLike);
}

export function importResultFromUnknown(input: unknown): ImportResult | null {
  if (typeof input !== 'object' || input === null) return null;
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.created) || !Array.isArray(obj.skipped) || !Array.isArray(obj.errors)) return null;
  if (obj.created.length + obj.skipped.length + obj.errors.length > MAX_ROWS * 3) return null;

  const created: ImportCreatedRow[] = [];
  for (const item of obj.created) {
    if (typeof item !== 'object' || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.email !== 'string' || typeof r.name !== 'string') return null;
    created.push({
      email: r.email,
      name: r.name,
      phone: typeof r.phone === 'string' ? r.phone : '',
      password: typeof r.password === 'string' ? r.password : '',
      generated: r.generated === true,
    });
  }

  const skipped: ImportSkippedRow[] = [];
  for (const item of obj.skipped) {
    if (typeof item !== 'object' || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.email !== 'string' || typeof r.reason !== 'string') return null;
    skipped.push({ email: r.email, reason: r.reason });
  }

  const errors: MemberRowIssue[] = [];
  for (const item of obj.errors) {
    if (typeof item !== 'object' || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.email !== 'string' || typeof r.reason !== 'string' || typeof r.rowNumber !== 'number') return null;
    errors.push({ rowNumber: r.rowNumber, email: r.email, reason: r.reason });
  }

  return { created, skipped, errors };
}
