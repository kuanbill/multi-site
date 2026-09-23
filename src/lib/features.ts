export const SYSTEM_FEATURES = [
  { key: 'pages', label: '頁面管理', icon: '📄', path: 'pages', description: '靜態頁面', isSystem: true },
  { key: 'posts', label: '文章/公告', icon: '📝', path: 'posts', description: '新聞與公告', isSystem: true },
  { key: 'media', label: '媒體庫', icon: '🖼️', path: 'media', description: '圖片與檔案', isSystem: true },
] as const;

export const DEFAULT_FEATURES = [
  { key: 'faq', label: '常見問題', icon: '❓', path: 'faq', description: '常見問題', isSystem: false },
  { key: 'timeline', label: '時程進度', icon: '📅', path: 'timeline', description: '專案時程', isSystem: false },
  { key: 'contact', label: '聯絡表單', icon: '✉️', path: 'contact', description: '聯絡我們', isSystem: false },
] as const;

export type FeatureKey = (typeof SYSTEM_FEATURES)[number]['key'] | (typeof DEFAULT_FEATURES)[number]['key'] | string;
