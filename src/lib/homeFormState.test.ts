import { describe, expect, it } from 'vitest';
import { buildHeroSaveHint, isHomeFormDirty, type HomeFormValues } from './homeFormState';

const base: HomeFormValues = {
  tagline: '歡迎蒞臨',
  intro: '專案介紹',
  heroMediaId: null,
  currentStage: '審議中',
  contactName: '王先生',
  contactPhone: '02-1234-5678',
  contactEmail: null,
  contactAddress: '',
};

describe('isHomeFormDirty', () => {
  it('is false when nothing changed', () => {
    expect(isHomeFormDirty({ ...base }, { ...base })).toBe(false);
  });

  it('detects a newly selected hero image', () => {
    expect(isHomeFormDirty({ ...base, heroMediaId: 7 }, base)).toBe(true);
  });

  it('detects a cleared hero image', () => {
    expect(isHomeFormDirty({ ...base, heroMediaId: null }, { ...base, heroMediaId: 7 })).toBe(true);
  });

  it('detects text edits', () => {
    expect(isHomeFormDirty({ ...base, tagline: '新標語' }, base)).toBe(true);
  });

  it('treats null and empty text as the same unsaved value', () => {
    const saved = { ...base, tagline: null, contactEmail: '' };
    const edited = { ...base, tagline: '', contactEmail: null };
    expect(isHomeFormDirty(edited, saved)).toBe(false);
  });

  it('keeps 0 and null distinct for numeric-ish fields', () => {
    expect(isHomeFormDirty({ ...base, currentStage: '0' }, base)).toBe(true);
  });
});

describe('buildHeroSaveHint', () => {
  it('tells the user to save right after picking an image', () => {
    expect(buildHeroSaveHint({ heroMediaId: 7, dirty: true })).toBe('已選取主圖，按「儲存首頁設定」後才會顯示於首頁。');
  });

  it('confirms the image is saved', () => {
    expect(buildHeroSaveHint({ heroMediaId: 7, dirty: false })).toBe('主圖已儲存，儲存時機為剛才的上傳。');
  });

  it('reports that no image is set', () => {
    expect(buildHeroSaveHint({ heroMediaId: null, dirty: false })).toBe('尚未設定主圖，儲存後首頁也不會顯示圖片。');
  });

  it('still reports no image when the hero was cleared but other fields changed', () => {
    expect(buildHeroSaveHint({ heroMediaId: null, dirty: true })).toBe('尚未設定主圖，儲存後首頁也不會顯示圖片。');
  });
});