import { describe, expect, it } from 'vitest';
import {
  buildYouTubeEmbedUrl,
  parseFeatureEntryType,
  parseYouTubeVideoId,
  validateCustomFeaturePath,
  validateFeatureEntryInput,
} from './featureEntryValidation';

describe('feature entry validation', () => {
  it('accepts only text, youtube, and image content types', () => {
    expect(parseFeatureEntryType('text')).toBe('text');
    expect(parseFeatureEntryType('youtube')).toBe('youtube');
    expect(parseFeatureEntryType('image')).toBe('image');
    expect(() => parseFeatureEntryType('iframe')).toThrow('內容類型無效');
  });

  it('parses allowed YouTube URLs and rejects spoofed hosts', () => {
    const videoId = 'dQw4w9WgXcQ';

    expect(parseYouTubeVideoId(`https://youtu.be/${videoId}`)).toBe(videoId);
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${videoId}`)).toBe(videoId);
    expect(parseYouTubeVideoId(`https://m.youtube.com/shorts/${videoId}`)).toBe(videoId);
    expect(buildYouTubeEmbedUrl(videoId)).toBe(`https://www.youtube-nocookie.com/embed/${videoId}`);
    expect(() => parseYouTubeVideoId('https://youtube.com.evil.example/watch?v=bad')).toThrow('YouTube 網址無效');
    expect(() => parseYouTubeVideoId('javascript:alert(1)')).toThrow('YouTube 網址無效');
  });

  it('accepts a single-segment lowercase feature path and rejects reserved routes', () => {
    expect(validateCustomFeaturePath('faq-center')).toBe('faq-center');
    expect(() => validateCustomFeaturePath('info/faq')).toThrow();
    expect(() => validateCustomFeaturePath('Announcement')).toThrow();
    expect(() => validateCustomFeaturePath('announcement')).toThrow('路徑與系統路由衝突');
  });

  it('validates required fields based on the selected content type', () => {
    expect(validateFeatureEntryInput({
      title: '  專案簡介 ',
      contentType: 'text',
      content: '  這是內容  ',
    })).toEqual({
      title: '專案簡介',
      contentType: 'text',
      content: '這是內容',
      youtubeUrl: null,
      mediaId: null,
    });

    expect(() => validateFeatureEntryInput({ title: '空文字', contentType: 'text', content: '  ' })).toThrow('內文不得為空');
    expect(() => validateFeatureEntryInput({ title: '影片', contentType: 'youtube', youtubeUrl: '' })).toThrow('YouTube 網址無效');
    expect(() => validateFeatureEntryInput({ title: '圖片', contentType: 'image', mediaId: '0' })).toThrow('媒體編號格式無效');
  });
});
