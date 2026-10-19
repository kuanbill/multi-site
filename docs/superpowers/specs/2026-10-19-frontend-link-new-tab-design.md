# 子網站管理前台連結開新分頁

## 目標

讓子網站管理列表的「前台」按鈕在新分頁或新視窗開啟，不離開目前的管理列表。

## 設計

- 只修改 `src/app/admin/sites/page.tsx` 的前台 `Link`。
- 加上 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 保留既有前台 URL、文字、樣式，以及「管理」「編輯」操作的目前頁面行為。

## 驗收條件

1. 前台連結包含 `target="_blank"`。
2. 前台連結包含 `rel="noopener noreferrer"`。
3. 其他操作連結不被改動。
4. 相關測試、TypeScript、lint 與 production build 通過。
