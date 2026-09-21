# 多子網站管理系統

一個完整的後台管理系統，可管理多個子網站，每個子網站擁有獨立的首頁、使用者帳號、權限、功能表及資料管理介面。

## 🚀 功能特色

### 核心功能
- **子網站管理** - 建立、編輯、刪除子網站，設定主題色與圖示
- **使用者管理** - 為各子網站建立獨立帳號，支援三種角色（管理員/編輯者/檢視者）
- **權限控制** - 精細的權限設定，控制各功能模組的存取
- **功能表管理** - 自訂各子網站的導覽功能表，支援排序與顯示控制
- **資料管理** - 動態定義資料集合與欄位結構，支援多種資料類型
- **網站預覽** - 即時預覽子網站首頁效果

### 技術架構
- React 18 + TypeScript
- Tailwind CSS 4
- Vite 6
- Lucide React Icons
- LocalStorage 資料持久化

## 📦 安裝與執行

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 型別檢查
npm run typecheck
```

## 🔐 預設帳號

### 管理員登入
- 帳號：`admin`
- 密碼：`admin123`

### 使用者登入（需先選擇子網站）
- 企業官網：`editor1` / `pass123`
- 電商平台：`shop_admin` / `pass123`

## 📁 專案結構

```
src/
├── components/
│   ├── AdminDashboard.tsx    # 後台主框架
│   ├── Dashboard.tsx         # 儀表板
│   ├── DataManager.tsx       # 資料管理
│   ├── Login.tsx             # 登入頁面
│   ├── MenuManager.tsx       # 功能表管理
│   ├── SiteManager.tsx       # 子網站管理
│   ├── SitePreview.tsx       # 網站預覽
│   └── UserManager.tsx       # 使用者管理
├── types.ts                  # 型別定義
├── store.ts                  # 資料存儲層
├── App.tsx                   # 主入口
├── main.tsx                  # 渲染入口
└── index.css                 # 全域樣式
```

## 🎯 使用流程

1. **管理員登入** - 使用 admin 帳號登入後台
2. **建立子網站** - 在「子網站管理」建立新的子網站
3. **設定使用者** - 在「使用者管理」為子網站建立帳號
4. **定義功能表** - 在「功能表管理」設定網站導覽
5. **管理資料** - 在「資料管理」建立資料集合與記錄
6. **預覽網站** - 在「網站預覽」查看網站效果

## 📝 License

MIT
