import { useState, useEffect } from 'react';
import { Account } from '../types';
import { getAccounts, saveAccount, deleteAccount, generateId } from '../database';
import { Plus, Edit2, Trash2, X, Check, Users, Search, Shield, Eye, EyeOff } from 'lucide-react';

export default function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    permissionType: 'viewer' as Account['permissionType'],
    status: 'active' as Account['status'],
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const allAccounts = await getAccounts();
    setAccounts(allAccounts);
  };

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingAccount(null);
    setForm({ name: '', username: '', password: '', permissionType: 'viewer', status: 'active' });
    setShowForm(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      username: account.username,
      password: account.password,
      permissionType: account.permissionType,
      status: account.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.username || !form.password) {
      alert('請填寫所有必填欄位');
      return;
    }
    const account: Account = {
      id: editingAccount?.id || generateId('acc'),
      name: form.name,
      username: form.username,
      password: form.password,
      permissionType: form.permissionType,
      status: form.status,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveAccount(account);
    await loadAccounts();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此帳號嗎？')) {
      await deleteAccount(id);
      await loadAccounts();
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getPermissionLabel = (type: Account['permissionType']) => {
    switch (type) {
      case 'admin': return '管理員';
      case 'editor': return '編輯者';
      case 'viewer': return '檢視者';
      default: return type;
    }
  };

  const getPermissionColor = (type: Account['permissionType']) => {
    switch (type) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'editor': return 'bg-yellow-100 text-yellow-700';
      case 'viewer': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">帳號管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系統帳號、權限與狀態</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          新增帳號
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="搜尋名稱或帳號..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">名稱</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">帳號</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">密碼</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">權限類別</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {account.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{account.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-sm text-gray-700 font-mono">{account.username}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-mono">
                        {showPasswords[account.id] ? account.password : '••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(account.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        {showPasswords[account.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPermissionColor(account.permissionType)}`}>
                      {getPermissionLabel(account.permissionType)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {account.status === 'active' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(account)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAccounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>尚無帳號，點擊「新增帳號」來建立</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingAccount ? '編輯帳號' : '新增帳號'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：王小明"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">帳號 *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：wangxm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密碼 *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請輸入密碼"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">權限類別</label>
                  <select
                    value={form.permissionType}
                    onChange={e => setForm({ ...form, permissionType: e.target.value as Account['permissionType'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">管理員</option>
                    <option value="editor">編輯者</option>
                    <option value="viewer">檢視者</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as Account['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Check className="w-4 h-4" />
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
