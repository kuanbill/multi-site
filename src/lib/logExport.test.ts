import { describe, expect, it } from 'vitest';
import {
  buildLoginLogCsv,
  buildViewLogCsv,
  formatLogTime,
  logExportFilename,
  parseLogType,
} from './logExport';

const BOM = '\uFEFF';

describe('parseLogType', () => {
  it('accepts the two supported log types', () => {
    expect(parseLogType('logins')).toBe('logins');
    expect(parseLogType('views')).toBe('views');
  });

  it('rejects unknown or missing values', () => {
    expect(parseLogType('stats')).toBeNull();
    expect(parseLogType(undefined)).toBeNull();
    expect(parseLogType(null)).toBeNull();
  });
});

describe('formatLogTime', () => {
  it('formats a date as local time without a timezone shift', () => {
    expect(formatLogTime(new Date(2026, 9, 5, 9, 7, 3))).toBe('2026-10-05 09:07:03');
  });
});

describe('buildLoginLogCsv', () => {
  it('starts with a BOM and Chinese headers so Excel opens it correctly', () => {
    const csv = buildLoginLogCsv([]);

    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain('"登入時間","使用者名稱","電子郵件"');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('quotes fields that contain commas and doubled quotes', () => {
    const csv = buildLoginLogCsv([
      { name: '王, "小明"', email: 'ming@example.com', createdAt: new Date(2026, 0, 2, 8, 5, 0) },
    ]);

    expect(csv).toContain('"2026-01-02 08:05:00","王, ""小明""","ming@example.com"');
  });
});

describe('buildViewLogCsv', () => {
  it('exports the feature label and path for each view', () => {
    const csv = buildViewLogCsv([
      { user: null, featureLabel: '公告欄', path: '/site-a/announcement', createdAt: new Date(2026, 9, 5, 10, 0, 0) },
    ]);

    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain('"瀏覽時間","使用者","功能","路徑"');
    expect(csv).toContain('"2026-10-05 10:00:00","","公告欄","/site-a/announcement"');
  });
});

describe('logExportFilename', () => {
  it('builds an ASCII filename per log type', () => {
    expect(logExportFilename('logins', 'zhonghe-renewal')).toBe('logins-zhonghe-renewal.csv');
    expect(logExportFilename('views', 'zhonghe-renewal')).toBe('views-zhonghe-renewal.csv');
  });
});
