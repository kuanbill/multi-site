import { Site, User, MenuItem, DataCollection, DataRecord, AdminUser } from './types';

const STORAGE_KEYS = {
  sites: 'msm_sites',
  users: 'msm_users',
  menus: 'msm_menus',
  collections: 'msm_collections',
  records: 'msm_records',
  admin: 'msm_admin',
  session: 'msm_session',
};

function getItem<T>(key: string, defaultValue: T): T {
  const item = localStorage.getItem(key);
  if (item) {
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Initialize default data
export function initializeStore(): void {
  const admin = getItem<AdminUser[]>(STORAGE_KEYS.admin, []);
  if (admin.length === 0) {
    setItem(STORAGE_KEYS.admin, [{
      id: 'admin-001',
      username: 'admin',
      password: 'admin123',
      role: 'superadmin',
    }]);
  }

  const sites = getItem<Site[]>(STORAGE_KEYS.sites, []);
  if (sites.length === 0) {
    const defaultSites: Site[] = [
      {
        id: 'site-001',
        name: '企業官網',
        domain: 'www.company.com',
        description: '公司官方網站，展示企業形象與產品資訊',
        status: 'active',
        createdAt: new Date().toISOString(),
        theme: { primaryColor: '#2563eb', logo: '🏢' },
      },
      {
        id: 'site-002',
        name: '電商平台',
        domain: 'shop.company.com',
        description: '線上購物平台，提供商品瀏覽與購買功能',
        status: 'active',
        createdAt: new Date().toISOString(),
        theme: { primaryColor: '#059669', logo: '🛒' },
      },
      {
        id: 'site-003',
        name: '部落格',
        domain: 'blog.company.com',
        description: '技術與生活分享部落格',
        status: 'inactive',
        createdAt: new Date().toISOString(),
        theme: { primaryColor: '#7c3aed', logo: '📝' },
      },
    ];
    setItem(STORAGE_KEYS.sites, defaultSites);
  }

  const users = getItem<User[]>(STORAGE_KEYS.users, []);
  if (users.length === 0) {
    const defaultUsers: User[] = [
      {
        id: 'user-001',
        siteId: 'site-001',
        username: 'editor1',
        password: 'pass123',
        email: 'editor1@company.com',
        role: 'editor',
        permissions: ['content.edit', 'content.view', 'media.upload'],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-002',
        siteId: 'site-001',
        username: 'admin1',
        password: 'pass123',
        email: 'admin1@company.com',
        role: 'admin',
        permissions: ['content.edit', 'content.view', 'media.upload', 'user.manage', 'settings.edit'],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-003',
        siteId: 'site-002',
        username: 'shop_admin',
        password: 'pass123',
        email: 'shop@company.com',
        role: 'admin',
        permissions: ['product.manage', 'order.manage', 'user.manage', 'settings.edit'],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ];
    setItem(STORAGE_KEYS.users, defaultUsers);
  }

  const menus = getItem<MenuItem[]>(STORAGE_KEYS.menus, []);
  if (menus.length === 0) {
    const defaultMenus: MenuItem[] = [
      { id: 'menu-001', siteId: 'site-001', label: '首頁', icon: 'Home', path: '/', parentId: null, order: 1, visible: true, permission: 'public' },
      { id: 'menu-002', siteId: 'site-001', label: '關於我們', icon: 'Info', path: '/about', parentId: null, order: 2, visible: true, permission: 'public' },
      { id: 'menu-003', siteId: 'site-001', label: '產品服務', icon: 'Package', path: '/products', parentId: null, order: 3, visible: true, permission: 'public' },
      { id: 'menu-004', siteId: 'site-001', label: '聯絡我們', icon: 'Mail', path: '/contact', parentId: null, order: 4, visible: true, permission: 'public' },
      { id: 'menu-005', siteId: 'site-002', label: '首頁', icon: 'Home', path: '/', parentId: null, order: 1, visible: true, permission: 'public' },
      { id: 'menu-006', siteId: 'site-002', label: '商品分類', icon: 'Grid', path: '/categories', parentId: null, order: 2, visible: true, permission: 'public' },
      { id: 'menu-007', siteId: 'site-002', label: '購物車', icon: 'ShoppingCart', path: '/cart', parentId: null, order: 3, visible: true, permission: 'public' },
      { id: 'menu-008', siteId: 'site-002', label: '會員中心', icon: 'User', path: '/member', parentId: null, order: 4, visible: true, permission: 'member' },
    ];
    setItem(STORAGE_KEYS.menus, defaultMenus);
  }

  const collections = getItem<DataCollection[]>(STORAGE_KEYS.collections, []);
  if (collections.length === 0) {
    const defaultCollections: DataCollection[] = [
      {
        id: 'col-001',
        siteId: 'site-001',
        name: '新聞公告',
        description: '公司新聞與公告資訊',
        fields: [
          { name: 'title', type: 'text', label: '標題', required: true },
          { name: 'content', type: 'textarea', label: '內容', required: true },
          { name: 'publishDate', type: 'date', label: '發布日期', required: true },
          { name: 'category', type: 'select', label: '分類', required: false, options: ['公司動態', '產品消息', '產業資訊'] },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'col-002',
        siteId: 'site-002',
        name: '商品資料',
        description: '電商平台商品資訊',
        fields: [
          { name: 'name', type: 'text', label: '商品名稱', required: true },
          { name: 'price', type: 'number', label: '價格', required: true },
          { name: 'stock', type: 'number', label: '庫存', required: true },
          { name: 'description', type: 'textarea', label: '商品描述', required: false },
          { name: 'active', type: 'boolean', label: '上架', required: false },
        ],
        createdAt: new Date().toISOString(),
      },
    ];
    setItem(STORAGE_KEYS.collections, defaultCollections);
  }

  const records = getItem<DataRecord[]>(STORAGE_KEYS.records, []);
  if (records.length === 0) {
    const defaultRecords: DataRecord[] = [
      { id: 'rec-001', siteId: 'site-001', collection: 'col-001', data: { title: '公司年度大會通知', content: '謹訂於本月25日舉行年度大會，敬請各位同仁準時出席。', publishDate: '2026-01-15', category: '公司動態' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-002', siteId: 'site-001', collection: 'col-001', data: { title: '新產品發表會', content: '我們很高興宣布新一代產品即將上市，敬請期待。', publishDate: '2026-01-20', category: '產品消息' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-003', siteId: 'site-002', collection: 'col-002', data: { name: '無線藍牙耳機', price: 1290, stock: 50, description: '高品質藍牙耳機，支援主動降噪', active: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-004', siteId: 'site-002', collection: 'col-002', data: { name: '智慧型手錶', price: 3990, stock: 30, description: '多功能智慧手錶，支援心率監測', active: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-005', siteId: 'site-002', collection: 'col-002', data: { name: '行動電源 10000mAh', price: 690, stock: 100, description: '大容量行動電源，支援快充', active: false }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    setItem(STORAGE_KEYS.records, defaultRecords);
  }
}

// Session Management
export function getSession(): { type: 'admin' | 'user'; id: string } | null {
  return getItem(STORAGE_KEYS.session, null);
}

export function setSession(session: { type: 'admin' | 'user'; id: string } | null): void {
  setItem(STORAGE_KEYS.session, session);
}

// Admin
export function getAdmins(): AdminUser[] {
  return getItem(STORAGE_KEYS.admin, []);
}

export function validateAdmin(username: string, password: string): AdminUser | null {
  const admins = getAdmins();
  return admins.find(a => a.username === username && a.password === password) || null;
}

// Sites
export function getSites(): Site[] {
  return getItem(STORAGE_KEYS.sites, []);
}

export function getSiteById(id: string): Site | undefined {
  return getSites().find(s => s.id === id);
}

export function saveSite(site: Site): void {
  const sites = getSites();
  const idx = sites.findIndex(s => s.id === site.id);
  if (idx >= 0) {
    sites[idx] = site;
  } else {
    sites.push(site);
  }
  setItem(STORAGE_KEYS.sites, sites);
}

export function deleteSite(id: string): void {
  setItem(STORAGE_KEYS.sites, getSites().filter(s => s.id !== id));
}

// Users
export function getUsers(): User[] {
  return getItem(STORAGE_KEYS.users, []);
}

export function getUsersBySite(siteId: string): User[] {
  return getUsers().filter(u => u.siteId === siteId);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setItem(STORAGE_KEYS.users, users);
}

export function deleteUser(id: string): void {
  setItem(STORAGE_KEYS.users, getUsers().filter(u => u.id !== id));
}

// Menus
export function getMenus(): MenuItem[] {
  return getItem(STORAGE_KEYS.menus, []);
}

export function getMenusBySite(siteId: string): MenuItem[] {
  return getMenus().filter(m => m.siteId === siteId).sort((a, b) => a.order - b.order);
}

export function saveMenu(menu: MenuItem): void {
  const menus = getMenus();
  const idx = menus.findIndex(m => m.id === menu.id);
  if (idx >= 0) {
    menus[idx] = menu;
  } else {
    menus.push(menu);
  }
  setItem(STORAGE_KEYS.menus, menus);
}

export function deleteMenu(id: string): void {
  setItem(STORAGE_KEYS.menus, getMenus().filter(m => m.id !== id));
}

// Collections
export function getCollections(): DataCollection[] {
  return getItem(STORAGE_KEYS.collections, []);
}

export function getCollectionsBySite(siteId: string): DataCollection[] {
  return getCollections().filter(c => c.siteId === siteId);
}

export function saveCollection(collection: DataCollection): void {
  const collections = getCollections();
  const idx = collections.findIndex(c => c.id === collection.id);
  if (idx >= 0) {
    collections[idx] = collection;
  } else {
    collections.push(collection);
  }
  setItem(STORAGE_KEYS.collections, collections);
}

export function deleteCollection(id: string): void {
  setItem(STORAGE_KEYS.collections, getCollections().filter(c => c.id !== id));
  setItem(STORAGE_KEYS.records, getRecords().filter(r => r.collection !== id));
}

// Records
export function getRecords(): DataRecord[] {
  return getItem(STORAGE_KEYS.records, []);
}

export function getRecordsByCollection(collectionId: string): DataRecord[] {
  return getRecords().filter(r => r.collection === collectionId);
}

export function saveRecord(record: DataRecord): void {
  const records = getRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    records.push(record);
  }
  setItem(STORAGE_KEYS.records, records);
}

export function deleteRecord(id: string): void {
  setItem(STORAGE_KEYS.records, getRecords().filter(r => r.id !== id));
}

// Generate ID
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
