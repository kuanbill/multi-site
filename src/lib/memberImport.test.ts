import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildResultWorkbookBuffer,
  buildTemplateWorkbookBuffer,
  generateTempPassword,
  importResultFromUnknown,
  MEMBER_TEMPLATE_HEADERS,
  parseMemberRows,
  readMemberWorkbook,
  TEMPLATE_SHEET_NAME,
} from './memberImport';

function rowsOf(values: unknown[][]): Array<{ rowNumber: number; values: unknown[] }> {
  return values.map((row, index) => ({ rowNumber: index + 1, values: row }));
}

async function xlsxWithRows(values: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);
  values.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBufferLike);
}

describe('generateTempPassword', () => {
  it('produces a 6 character alphanumeric password with letters and digits', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generateTempPassword();
      expect(password).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(password).toMatch(/[A-Za-z]/);
      expect(password).toMatch(/[0-9]/);
    }
  });

  it('produces different passwords across calls', () => {
    const samples = new Set(Array.from({ length: 100 }, () => generateTempPassword()));
    expect(samples.size).toBeGreaterThan(1);
  });
});

describe('parseMemberRows', () => {
  it('parses valid rows and lowercases email', () => {
    const parsed = parseMemberRows(
      rowsOf([
        ['Email', '姓名', '手機'],
        ['A@Example.com', '王小明', '0912345678'],
        ['second@example.com', '李小華', ''],
      ]),
    );

    expect(parsed.headerError).toBeUndefined();
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries).toEqual([
      { rowNumber: 2, email: 'a@example.com', name: '王小明', phone: '0912345678' },
      { rowNumber: 3, email: 'second@example.com', name: '李小華', phone: '' },
    ]);
  });

  it('maps columns by header names even when reordered', () => {
    const parsed = parseMemberRows(
      rowsOf([
        ['手機', '姓名', 'Email'],
        ['0912345678', '王小明', 'a@example.com'],
      ]),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.entries[0]).toMatchObject({ email: 'a@example.com', name: '王小明', phone: '0912345678' });
  });

  it('reports a header error when the template header is missing', () => {
    const parsed = parseMemberRows(rowsOf([['Name', 'Mail'], ['王小明', 'a@example.com']]));

    expect(parsed.headerError).toContain('範本');
    expect(parsed.entries).toEqual([]);
  });

  it('collects row errors without stopping other rows', () => {
    const parsed = parseMemberRows(
      rowsOf([
        ['Email', '姓名', '手機'],
        ['', '缺信箱', ''],
        ['not-an-email', '格式錯', ''],
        ['ok@example.com', '丁', ''],
        ['dup@example.com', '甲', ''],
        ['dup@example.com', '乙', ''],
        ['phone@example.com', '丙', 'abc123'],
        [' ', ' ', ' '],
      ]),
    );

    expect(parsed.entries.map((e) => e.email)).toEqual(['ok@example.com', 'dup@example.com']);
    expect(parsed.errors.map((e) => e.reason)).toEqual([
      '缺少 Email',
      'Email 格式不正確',
      '檔案內 Email 重複',
      '手機格式不正確（限 6-20 碼數字與 +()-',
    ]);
    expect(parsed.errors.map((e) => e.rowNumber)).toEqual([2, 3, 6, 7]);
  });

  it('skips empty rows before the header', () => {
    const parsed = parseMemberRows(
      rowsOf([
        ['', '', ''],
        ['Email', '姓名', '手機'],
        ['a@example.com', '王小明', ''],
      ]),
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.entries).toHaveLength(1);
  });
});

describe('workbook round trips', () => {
  it('builds a template with the expected headers and instructions', async () => {
    const buffer = await buildTemplateWorkbookBuffer();
    expect(buffer.length).toBeGreaterThan(100);

    const rows = await readMemberWorkbook(buffer);
    expect(rows[0].values).toEqual([...MEMBER_TEMPLATE_HEADERS]);
  });

  it('reads back rows written to a worksheet', async () => {
    const buffer = await xlsxWithRows([
      ['Email', '姓名', '手機'],
      ['a@example.com', '王小明', '0912345678'],
    ]);

    const parsed = parseMemberRows(await readMemberWorkbook(buffer));
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries).toEqual([
      { rowNumber: 2, email: 'a@example.com', name: '王小明', phone: '0912345678' },
    ]);
  });

  it('rejects buffers that are not excel files', async () => {
    await expect(readMemberWorkbook(Buffer.from('not an xlsx'))).rejects.toThrow();
  });

  it('builds a result workbook containing generated passwords', async () => {
    const buffer = await buildResultWorkbookBuffer({
      created: [
        { email: 'a@example.com', name: '王小明', phone: '0912345678', password: 'ab3k9z', generated: true },
      ],
      skipped: [{ email: 'b@example.com', reason: '已是本站成員' }],
      errors: [{ rowNumber: 4, email: 'c@example.com', reason: 'Email 格式不正確' }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    const text = sheet.getRows(1, sheet.rowCount)?.map((row) => row.values).flat().join('|') ?? '';
    expect(text).toContain('ab3k9z');
    expect(text).toContain('已是本站成員');
    expect(text).toContain('Email 格式不正確');
  });
});

describe('importResultFromUnknown', () => {
  it('accepts a valid result payload', () => {
    const result = importResultFromUnknown({
      created: [{ email: 'a@example.com', name: '甲', phone: '0911', password: 'ab12cd', generated: true }],
      skipped: [],
      errors: [],
    });

    expect(result?.created).toHaveLength(1);
  });

  it('rejects malformed payloads', () => {
    expect(importResultFromUnknown(null)).toBeNull();
    expect(importResultFromUnknown({ created: [], skipped: [] })).toBeNull();
    expect(
      importResultFromUnknown({ created: [], skipped: [], errors: [{ email: 1, reason: 'x', rowNumber: 2 }] }),
    ).toBeNull();
    expect(
      importResultFromUnknown({ created: [], skipped: [], errors: [{ email: 'x', reason: 'y' }] }),
    ).toBeNull();
  });
});
