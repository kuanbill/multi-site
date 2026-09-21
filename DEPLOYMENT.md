# 部署指南

本專案為純前端應用，部署非常簡單。以下提供多種部署方案：

## 📦 建置專案

```bash
# 安裝依賴
npm install

# 建置生產版本
npm run build

# 建置完成後，所有檔案會在 dist/ 目錄中
```

## 🚀 部署方案

### 方案一：傳統虛擬主機 / VPS（推薦）

適用：任何支援靜態網站的主機（Apache、Nginx 等）

#### Nginx 設定

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/multi-site-management;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 啟用 gzip 壓縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

#### 部署步驟

```bash
# 1. 在本地建置
npm run build

# 2. 上傳 dist 目錄到伺服器
scp -r dist/* user@your-server:/var/www/multi-site-management/

# 或使用 rsync
rsync -avz dist/ user@your-server:/var/www/multi-site-management/

# 3. 重新載入 Nginx
sudo systemctl reload nginx
```

#### Apache 設定

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/multi-site-management
    
    <Directory /var/www/multi-site-management>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

---

### 方案二：Docker 部署

#### 1. 建立 Dockerfile

```dockerfile
# 建置階段
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 執行階段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 建立 nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

#### 3. 建置並執行

```bash
# 建置 Docker 映像
docker build -t multi-site-management .

# 執行容器
docker run -d -p 80:80 --name msm multi-site-management

# 或使用 docker-compose
```

#### 4. docker-compose.yml（選用）

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    restart: always
```

```bash
# 啟動
docker-compose up -d

# 停止
docker-compose down
```

---

### 方案三：雲端平台部署

#### Vercel（最簡單）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 部署
vercel

# 依照提示操作即可
```

#### Netlify

```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 部署
netlify deploy --prod --dir=dist
```

#### GitHub Pages

```bash
# 安裝 gh-pages
npm install -D gh-pages

# 在 package.json 加入
# "scripts": {
#   "deploy": "gh-pages -d dist"
# }

# 部署
npm run build
npm run deploy
```

---

### 方案四：FTP/SFTP 上傳

適用於傳統虛擬主機：

```bash
# 使用 FileZilla 或其他 FTP 客戶端

# 1. 連線到您的主機
# 2. 上傳 dist/ 目錄中的所有檔案到 public_html/ 或 www/
```

---

## 🔒 HTTPS 設定（建議）

### 使用 Let's Encrypt（免費 SSL）

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 取得 SSL 憑證
sudo certbot --nginx -d your-domain.com

# 自動更新
sudo certbot renew --dry-run
```

---

## 📋 完整部署流程（VPS）

```bash
# === 在本地電腦 ===

# 1. 建置專案
npm install
npm run build

# 2. 打包建置檔案
tar -czf dist.tar.gz dist/

# === 在遠端伺服器 ===

# 3. SSH 連線到伺服器
ssh user@your-server

# 4. 建立網站目錄
sudo mkdir -p /var/www/multi-site-management
sudo chown $USER:$USER /var/www/multi-site-management

# 5. 上傳並解壓縮（在本地執行）
scp dist.tar.gz user@your-server:/tmp/
ssh user@your-server "tar -xzf /tmp/dist.tar.gz -C /var/www/multi-site-management --strip-components=1"

# 6. 設定 Nginx
sudo nano /etc/nginx/sites-available/multi-site-management
# 貼上 Nginx 設定內容

# 7. 啟用網站
sudo ln -s /etc/nginx/sites-available/multi-site-management /etc/nginx/sites-enabled/

# 8. 測試設定
sudo nginx -t

# 9. 重新載入 Nginx
sudo systemctl reload nginx

# 10. 設定防火牆（如需）
sudo ufw allow 'Nginx Full'
```

---

## 🔧 環境變數設定（如需）

目前系統使用 IndexedDB 本地儲存，無需後端環境變數。

如未來需要連接後端 API，可建立 `.env` 檔案：

```env
VITE_API_URL=https://api.your-domain.com
VITE_APP_NAME=多子網站管理系統
```

---

## 📊 監控與維護

### 查看 Nginx 日誌

```bash
# 錯誤日誌
sudo tail -f /var/log/nginx/error.log

# 存取日誌
sudo tail -f /var/log/nginx/access.log
```

### 備份資料

由於資料儲存在瀏覽器的 IndexedDB，建議定期使用系統的「匯出資料庫」功能備份。

---

## ❓ 常見問題

### Q: 部署後頁面空白？
A: 檢查 Nginx/Apache 設定是否正確，確保 `try_files` 指向 `index.html`

### Q: 404 錯誤？
A: 確認所有檔案已正確上傳，檢查檔案權限

### Q: 資料會遺失嗎？
A: 資料儲存在使用者瀏覽器的 IndexedDB，清除瀏覽器資料會遺失。建議定期匯出備份。

### Q: 可以多人使用嗎？
A: 可以，但每個人的資料是獨立的（儲存在各自的瀏覽器）。如需共享資料，需要連接後端資料庫。

---

## 📞 技術支援

如有部署問題，請檢查：
1. 瀏覽器控制台是否有錯誤訊息
2. Nginx/Apache 日誌
3. 檔案權限是否正確
4. 防火牆設定

祝您部署順利！🎉
