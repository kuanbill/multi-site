import { Site, User, MenuItem, DataCollection, DataRecord, AdminUser, Account } from './types';

// IndexedDB 資料庫名稱和版本
const DB_NAME = 'MultiSiteManagementDB';
const DB_VERSION = 1;

// 物件存儲名稱
const STORES = {
  SITES: 'sites',
  USERS: 'users',
  MENUS: 'menus',
  COLLECTIONS: 'collections',
  RECORDS: 'records',
  ADMINS: 'admins',
  SESSION: 'session',
  ACCOUNTS: 'accounts',
};

let db: IDBDatabase | null = null;

// 初始化資料庫
export function initDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('資料庫初始化失敗'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 建立物件存儲
      if (!database.objectStoreNames.contains(STORES.SITES)) {
        const siteStore = database.createObjectStore(STORES.SITES, { keyPath: 'id' });
        siteStore.createIndex('status', 'status', { unique: false });
        siteStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.USERS)) {
        const userStore = database.createObjectStore(STORES.USERS, { keyPath: 'id' });
        userStore.createIndex('siteId', 'siteId', { unique: false });
        userStore.createIndex('username', 'username', { unique: false });
        userStore.createIndex('status', 'status', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.MENUS)) {
        const menuStore = database.createObjectStore(STORES.MENUS, { keyPath: 'id' });
        menuStore.createIndex('siteId', 'siteId', { unique: false });
        menuStore.createIndex('order', 'order', { unique: false });
        menuStore.createIndex('parentId', 'parentId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.COLLECTIONS)) {
        const collectionStore = database.createObjectStore(STORES.COLLECTIONS, { keyPath: 'id' });
        collectionStore.createIndex('siteId', 'siteId', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.RECORDS)) {
        const recordStore = database.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
        recordStore.createIndex('siteId', 'siteId', { unique: false });
        recordStore.createIndex('collection', 'collection', { unique: false });
        recordStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.ADMINS)) {
        database.createObjectStore(STORES.ADMINS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.SESSION)) {
        database.createObjectStore(STORES.SESSION, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.ACCOUNTS)) {
        const accountStore = database.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id' });
        accountStore.createIndex('username', 'username', { unique: true });
        accountStore.createIndex('permissionType', 'permissionType', { unique: false });
        accountStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// 通用 CRUD 操作
function dbOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    if (!db) {
      await initDatabase();
    }

    const transaction = db!.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 取得所有資料
function getAll<T>(storeName: string): Promise<T[]> {
  return dbOperation(storeName, 'readonly', (store) => store.getAll());
}

// 根據 ID 取得資料
function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  return dbOperation(storeName, 'readonly', (store) => store.get(id));
}

// 新增或更新資料
function put<T>(storeName: string, data: T): Promise<IDBValidKey> {
  return dbOperation(storeName, 'readwrite', (store) => store.put(data));
}

// 刪除資料
function remove(storeName: string, id: string): Promise<void> {
  return dbOperation(storeName, 'readwrite', (store) => store.delete(id));
}

// 根據索引查詢
function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: any
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    if (!db) {
      await initDatabase();
    }

    const transaction = db!.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 清空儲存
function clearStore(storeName: string): Promise<void> {
  return dbOperation(storeName, 'readwrite', (store) => store.clear());
}

// ============ 管理員操作 ============

export async function getAdmins(): Promise<AdminUser[]> {
  return getAll<AdminUser>(STORES.ADMINS);
}

export async function saveAdmin(admin: AdminUser): Promise<void> {
  await put(STORES.ADMINS, admin);
}

export async function validateAdmin(username: string, password: string): Promise<AdminUser | null> {
  const admins = await getAdmins();
  return admins.find(a => a.username === username && a.password === password) || null;
}

// ============ Session 操作 ============

export async function getSession(): Promise<{ type: 'admin' | 'user'; id: string } | null> {
  const sessions = await getAll<{ id: string; type: 'admin' | 'user'; userId: string }>(STORES.SESSION);
  return sessions.length > 0 ? { type: sessions[0].type, id: sessions[0].userId } : null;
}

export async function setSession(session: { type: 'admin' | 'user'; id: string } | null): Promise<void> {
  await clearStore(STORES.SESSION);
  if (session) {
    await put(STORES.SESSION, { id: 'current', type: session.type, userId: session.id });
  }
}

// ============ 子網站操作 ============

export async function getSites(): Promise<Site[]> {
  return getAll<Site>(STORES.SITES);
}

export async function getSiteById(id: string): Promise<Site | undefined> {
  return getById<Site>(STORES.SITES, id);
}

export async function saveSite(site: Site): Promise<void> {
  await put(STORES.SITES, site);
}

export async function deleteSite(id: string): Promise<void> {
  await remove(STORES.SITES, id);
  // 同時刪除相關的 users, menus, collections, records
  const users = await getUsersBySite(id);
  for (const user of users) {
    await deleteUser(user.id);
  }
  const menus = await getMenusBySite(id);
  for (const menu of menus) {
    await deleteMenu(menu.id);
  }
  const collections = await getCollectionsBySite(id);
  for (const collection of collections) {
    await deleteCollection(collection.id);
  }
}

// ============ 使用者操作 ============

export async function getUsers(): Promise<User[]> {
  return getAll<User>(STORES.USERS);
}

export async function getUsersBySite(siteId: string): Promise<User[]> {
  return getByIndex<User>(STORES.USERS, 'siteId', siteId);
}

export async function saveUser(user: User): Promise<void> {
  await put(STORES.USERS, user);
}

export async function deleteUser(id: string): Promise<void> {
  await remove(STORES.USERS, id);
}

// ============ 功能表操作 ============

export async function getMenus(): Promise<MenuItem[]> {
  return getAll<MenuItem>(STORES.MENUS);
}

export async function getMenusBySite(siteId: string): Promise<MenuItem[]> {
  const menus = await getByIndex<MenuItem>(STORES.MENUS, 'siteId', siteId);
  return menus.sort((a, b) => a.order - b.order);
}

export async function saveMenu(menu: MenuItem): Promise<void> {
  await put(STORES.MENUS, menu);
}

export async function deleteMenu(id: string): Promise<void> {
  await remove(STORES.MENUS, id);
}

// ============ 資料集合操作 ============

export async function getCollections(): Promise<DataCollection[]> {
  return getAll<DataCollection>(STORES.COLLECTIONS);
}

export async function getCollectionsBySite(siteId: string): Promise<DataCollection[]> {
  return getByIndex<DataCollection>(STORES.COLLECTIONS, 'siteId', siteId);
}

export async function saveCollection(collection: DataCollection): Promise<void> {
  await put(STORES.COLLECTIONS, collection);
}

export async function deleteCollection(id: string): Promise<void> {
  await remove(STORES.COLLECTIONS, id);
  // 刪除相關的 records
  const records = await getRecordsByCollection(id);
  for (const record of records) {
    await deleteRecord(record.id);
  }
}

// ============ 資料記錄操作 ============

export async function getRecords(): Promise<DataRecord[]> {
  return getAll<DataRecord>(STORES.RECORDS);
}

export async function getRecordsByCollection(collectionId: string): Promise<DataRecord[]> {
  return getByIndex<DataRecord>(STORES.RECORDS, 'collection', collectionId);
}

export async function saveRecord(record: DataRecord): Promise<void> {
  await put(STORES.RECORDS, { ...record, updatedAt: new Date().toISOString() });
}

export async function deleteRecord(id: string): Promise<void> {
  await remove(STORES.RECORDS, id);
}

// ============ 初始化預設資料 ============

export async function initializeDatabase(): Promise<void> {
  await initDatabase();

  // 檢查是否已有管理員
  const admins = await getAdmins();
  if (admins.length === 0) {
    await saveAdmin({
      id: 'admin-001',
      username: 'admin',
      password: 'admin123',
      role: 'superadmin',
    });
  }

  // 檢查是否已有子網站
  const sites = await getSites();
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
    for (const site of defaultSites) {
      await saveSite(site);
    }
  }

  // 檢查是否已有使用者
  const users = await getUsers();
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
    for (const user of defaultUsers) {
      await saveUser(user);
    }
  }

  // 檢查是否已有功能表
  const menus = await getMenus();
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
    for (const menu of defaultMenus) {
      await saveMenu(menu);
    }
  }

  // 檢查是否已有資料集合
  const collections = await getCollections();
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
    for (const collection of defaultCollections) {
      await saveCollection(collection);
    }
  }

  // 檢查是否已有資料記錄
  const records = await getRecords();
  if (records.length === 0) {
    const defaultRecords: DataRecord[] = [
      { id: 'rec-001', siteId: 'site-001', collection: 'col-001', data: { title: '公司年度大會通知', content: '謹訂於本月25日舉行年度大會，敬請各位同仁準時出席。', publishDate: '2026-01-15', category: '公司動態' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-002', siteId: 'site-001', collection: 'col-001', data: { title: '新產品發表會', content: '我們很高興宣布新一代產品即將上市，敬請期待。', publishDate: '2026-01-20', category: '產品消息' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-003', siteId: 'site-002', collection: 'col-002', data: { name: '無線藍牙耳機', price: 1290, stock: 50, description: '高品質藍牙耳機，支援主動降噪', active: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-004', siteId: 'site-002', collection: 'col-002', data: { name: '智慧型手錶', price: 3990, stock: 30, description: '多功能智慧手錶，支援心率監測', active: true }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'rec-005', siteId: 'site-002', collection: 'col-002', data: { name: '行動電源 10000mAh', price: 690, stock: 100, description: '大容量行動電源，支援快充', active: false }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    for (const record of defaultRecords) {
      await saveRecord(record);
    }
  }

  // 檢查是否已有帳號
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    const defaultAccounts: Account[] = [
      {
        id: 'acc-001',
        name: '系統管理者',
        username: 'admin',
        password: 'Super6608551',
        permissionType: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc-002',
        name: '李小華',
        username: 'lisa',
        password: 'pass123',
        permissionType: 'editor',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc-003',
        name: '張大偉',
        username: 'zhangdw',
        password: 'pass123',
        permissionType: 'viewer',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc-004',
        name: '陳美玲',
        username: 'chenml',
        password: 'pass123',
        permissionType: 'editor',
        status: 'inactive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    for (const account of defaultAccounts) {
      await saveAccount(account);
    }
  }
}

// 產生唯一 ID
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ 帳號管理操作 ============

export async function getAccounts(): Promise<Account[]> {
  return getAll<Account>(STORES.ACCOUNTS);
}

export async function getAccountById(id: string): Promise<Account | undefined> {
  return getById<Account>(STORES.ACCOUNTS, id);
}

export async function getAccountsByPermission(permissionType: Account['permissionType']): Promise<Account[]> {
  return getByIndex<Account>(STORES.ACCOUNTS, 'permissionType', permissionType);
}

export async function getAccountsByStatus(status: Account['status']): Promise<Account[]> {
  return getByIndex<Account>(STORES.ACCOUNTS, 'status', status);
}

export async function saveAccount(account: Account): Promise<void> {
  await put(STORES.ACCOUNTS, { ...account, updatedAt: new Date().toISOString() });
}

export async function deleteAccount(id: string): Promise<void> {
  await remove(STORES.ACCOUNTS, id);
}

export async function validateAccount(username: string, password: string): Promise<Account | null> {
  const accounts = await getAccounts();
  return accounts.find(a => a.username === username && a.password === password && a.status === 'active') || null;
}

// 匯出資料庫
export async function exportDatabase(): Promise<string> {
  const data = {
    sites: await getSites(),
    users: await getUsers(),
    menus: await getMenus(),
    collections: await getCollections(),
    records: await getRecords(),
    admins: await getAdmins(),
    accounts: await getAccounts(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// 匯入資料庫
export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  
  await clearStore(STORES.SITES);
  await clearStore(STORES.USERS);
  await clearStore(STORES.MENUS);
  await clearStore(STORES.COLLECTIONS);
  await clearStore(STORES.RECORDS);
  await clearStore(STORES.ADMINS);
  await clearStore(STORES.ACCOUNTS);

  if (data.admins) {
    for (const admin of data.admins) {
      await saveAdmin(admin);
    }
  }
  if (data.sites) {
    for (const site of data.sites) {
      await saveSite(site);
    }
  }
  if (data.users) {
    for (const user of data.users) {
      await saveUser(user);
    }
  }
  if (data.menus) {
    for (const menu of data.menus) {
      await saveMenu(menu);
    }
  }
  if (data.collections) {
    for (const collection of data.collections) {
      await saveCollection(collection);
    }
  }
  if (data.accounts) {
    for (const account of data.accounts) {
      await saveAccount(account);
    }
  }
  if (data.records) {
    for (const record of data.records) {
      await saveRecord(record);
    }
  }
}
