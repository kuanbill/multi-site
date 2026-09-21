import { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsersBySite, getSites, saveUser, deleteUser, generateId } from '../database';
import { Site } from '../types';
import { Plus, Edit2, Trash2, X, Check, Users, Search } from 'lucide-react';

interface UserManagerProps {
  selectedSiteId: string;
}

const ALL_PERMISSIONS = [
  'content.view', 'content.edit', 'content.delete',
  'media.upload', 'media.delete',
  'user.manage', 'user.view',
  'settings.edit', 'settings.view',
  'product.manage', 'product.view',
  'order.manage', 'order.view',
  'report.view', 'report.export',
];

export default function UserManager({ selectedSiteId }: UserManagerProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState(selectedSiteId || '');
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    username: '', password: '', email: '', role: 'viewer' as User['role'],
    permissions: [] as string[], status: 'active' as User['status'],
  });

  useEffect(() => {
    const init = async () => {
      const allSites = await getSites();
      setSites(allSites);
      const siteId = selectedSiteId || allSites[0]?.id || '';
      setActiveSiteId(siteId);
      if (siteId) {
        const siteUsers = await getUsersBySite(siteId);
        setUsers(siteUsers);
      }
    };
    init();
  }, [selectedSiteId]);

  const handleSiteChange = async (siteId: string) => {
    setActiveSiteId(siteId);
    const siteUsers = await getUsersBySite(siteId);
    setUsers(siteUsers);
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', email: '', role: 'viewer', permissions: [], status: 'active' });
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username, password: user.password, email: user.email,
      role: user.role, permissions: [...user.permissions], status: user.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.password || !form.email) return;
    const user: User = {
      id: editingUser?.id || generateId('user'),
      siteId: activeSiteId,
      username: form.username,
      password: form.password,
      email: form.email,
      role: form.role,
      permissions: form.permissions,
      status: form.status,
      createdAt: editingUser?.createdAt || new Date().toISOString(),
    };
    await saveUser(user);
    const siteUsers = await getUsersBySite(activeSiteId);
    setUsers(siteUsers);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此使用者嗎？')) {
      await deleteUser(id);
      const siteUsers = await getUsersBySite(activeSiteId);
      setUsers(siteUsers);
    }
  };

  const togglePermission = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  if (!activeSiteId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>請先選擇一個子網站來管理使用者</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">使用者管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理 <span className="font-medium text-blue-600">{sites.find(s => s.id === activeSiteId)?.name}</span> 的使用者帳號與權限
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
            <Plus className="w-4 h-4" /> 新增使用者
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="搜尋使用者..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用者</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">權限</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' :
                      user.role === 'editor' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? '管理員' : user.role === 'editor' ? '編輯者' : '檢視者'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.permissions.slice(0, 3).map(p => (
                        <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{p}</span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-xs">+{user.permissions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {user.status === 'active' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500"><p>尚無使用者，點擊「新增使用者」來建立</p></div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingUser ? '編輯使用者' : '新增使用者'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">帳號 *</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密碼 *</label>
                  <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as User['role'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="admin">管理員</option>
                    <option value="editor">編輯者</option>
                    <option value="viewer">檢視者</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as User['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">權限設定</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePermission(perm)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
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
