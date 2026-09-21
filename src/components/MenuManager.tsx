import { useState, useEffect } from 'react';
import { MenuItem, Site } from '../types';
import { getMenusBySite, getSites, saveMenu, deleteMenu, generateId } from '../database';
import { Plus, Edit2, Trash2, X, Check, Menu as MenuIcon, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

interface MenuManagerProps {
  selectedSiteId: string;
}

const ICON_OPTIONS = ['Home', 'Info', 'Package', 'Mail', 'Grid', 'ShoppingCart', 'User', 'Settings', 'FileText', 'Calendar', 'Image', 'Video', 'Book', 'Star', 'Heart', 'Search'];

export default function MenuManager({ selectedSiteId }: MenuManagerProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState(selectedSiteId || '');
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({
    label: '', icon: 'Home', path: '', parentId: null as string | null,
    order: 1, visible: true, permission: 'public',
  });

  useEffect(() => {
    const init = async () => {
      const allSites = await getSites();
      setSites(allSites);
      const siteId = selectedSiteId || allSites[0]?.id || '';
      setActiveSiteId(siteId);
      if (siteId) {
        const siteMenus = await getMenusBySite(siteId);
        setMenus(siteMenus);
      }
    };
    init();
  }, [selectedSiteId]);

  const handleSiteChange = async (siteId: string) => {
    setActiveSiteId(siteId);
    const siteMenus = await getMenusBySite(siteId);
    setMenus(siteMenus);
  };

  const refresh = async () => {
    if (activeSiteId) {
      const siteMenus = await getMenusBySite(activeSiteId);
      setMenus(siteMenus);
    }
  };

  const openCreate = () => {
    setEditingMenu(null);
    setForm({ label: '', icon: 'Home', path: '', parentId: null, order: menus.length + 1, visible: true, permission: 'public' });
    setShowForm(true);
  };

  const openEdit = (menu: MenuItem) => {
    setEditingMenu(menu);
    setForm({
      label: menu.label, icon: menu.icon, path: menu.path,
      parentId: menu.parentId, order: menu.order, visible: menu.visible, permission: menu.permission,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.path) return;
    const menu: MenuItem = {
      id: editingMenu?.id || generateId('menu'),
      siteId: activeSiteId,
      label: form.label, icon: form.icon, path: form.path,
      parentId: form.parentId, order: form.order, visible: form.visible, permission: form.permission,
    };
    await saveMenu(menu);
    await refresh();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此功能表項目嗎？')) {
      await deleteMenu(id);
      await refresh();
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newMenus = [...menus];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMenus.length) return;
    const tempOrder = newMenus[index].order;
    newMenus[index] = { ...newMenus[index], order: newMenus[targetIndex].order };
    newMenus[targetIndex] = { ...newMenus[targetIndex], order: tempOrder };
    [newMenus[index], newMenus[targetIndex]] = [newMenus[targetIndex], newMenus[index]];
    for (const m of newMenus) { await saveMenu(m); }
    await refresh();
  };

  const toggleVisibility = async (menu: MenuItem) => {
    await saveMenu({ ...menu, visible: !menu.visible });
    await refresh();
  };

  if (!activeSiteId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MenuIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>請先選擇一個子網站來管理功能表</p>
      </div>
    );
  }

  const parentMenus = menus.filter(m => !m.parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">功能表管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            定義 <span className="font-medium text-blue-600">{sites.find(s => s.id === activeSiteId)?.name}</span> 的導覽功能表
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={activeSiteId} onChange={e => handleSiteChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> 新增項目
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">功能表預覽</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 flex-wrap bg-gray-100 rounded-lg p-2">
            {parentMenus.map(menu => (
              <div key={menu.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${
                menu.visible ? 'bg-white shadow-sm text-gray-800' : 'bg-gray-200 text-gray-400 line-through'
              }`}>
                <span className="text-xs">{menu.icon === 'Home' ? '🏠' : menu.icon === 'Info' ? 'ℹ️' : menu.icon === 'Package' ? '📦' : menu.icon === 'Mail' ? '✉️' : menu.icon === 'Grid' ? '⊞' : menu.icon === 'ShoppingCart' ? '🛒' : menu.icon === 'User' ? '👤' : '📄'}</span>
                {menu.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {menus.map((menu, index) => (
            <div key={menu.id} className={`px-5 py-3 flex items-center gap-4 hover:bg-gray-50 ${menu.parentId ? 'pl-12' : ''}`}>
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div className="flex-1 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  menu.visible ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {menu.icon === 'Home' ? '🏠' : menu.icon === 'Info' ? 'ℹ️' : menu.icon === 'Package' ? '📦' : menu.icon === 'Mail' ? '✉️' : menu.icon === 'Grid' ? '⊞' : menu.icon === 'ShoppingCart' ? '🛒' : menu.icon === 'User' ? '👤' : '📄'}
                </div>
                <div>
                  <p className={`text-sm font-medium ${menu.visible ? 'text-gray-800' : 'text-gray-400'}`}>{menu.label}</p>
                  <p className="text-xs text-gray-500">{menu.path} • 權限: {menu.permission}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveItem(index, 'up')} className="p-1 text-gray-400 hover:text-gray-600 rounded" disabled={index === 0}>
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => moveItem(index, 'down')} className="p-1 text-gray-400 hover:text-gray-600 rounded" disabled={index === menus.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button onClick={() => toggleVisibility(menu)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg">
                  {menu.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(menu)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(menu.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {menus.length === 0 && (
          <div className="text-center py-8 text-gray-500"><p>尚無功能表項目，點擊「新增項目」來建立</p></div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingMenu ? '編輯功能表項目' : '新增功能表項目'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">標籤名稱 *</label>
                <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：首頁" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">路徑 *</label>
                <input type="text" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：/about" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">圖示</label>
                  <select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ICON_OPTIONS.map(icon => (<option key={icon} value={icon}>{icon}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">父層項目</label>
                  <select value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">無（頂層）</option>
                    {parentMenus.filter(m => m.id !== editingMenu?.id).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">權限</label>
                  <select value={form.permission} onChange={e => setForm({ ...form, permission: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="public">公開</option>
                    <option value="member">會員</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">顯示在功能表</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Check className="w-4 h-4" /> 儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
