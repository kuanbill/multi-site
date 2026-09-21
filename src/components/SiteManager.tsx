import { useState } from 'react';
import { Site } from '../types';
import { getSites, saveSite, deleteSite, generateId } from '../store';
import { Plus, Edit2, Trash2, Globe, Check, X } from 'lucide-react';

interface SiteManagerProps {
  onSelectSite: (siteId: string) => void;
}

const COLORS = ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#4f46e5', '#be185d'];
const LOGOS = ['🏢', '🛒', '📝', '🎮', '📱', '💼', '🎓', '🏥', '✈️', '🍕'];

export default function SiteManager({ onSelectSite }: SiteManagerProps) {
  const [sites, setSites] = useState<Site[]>(getSites());
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<{
    name: string; domain: string; description: string; status: 'active' | 'inactive';
    primaryColor: string; logo: string;
  }>({
    name: '', domain: '', description: '', status: 'active',
    primaryColor: COLORS[0], logo: LOGOS[0],
  });

  const refresh = () => setSites(getSites());

  const openCreate = () => {
    setEditingSite(null);
    setForm({ name: '', domain: '', description: '', status: 'active', primaryColor: COLORS[0], logo: LOGOS[0] });
    setShowForm(true);
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    setForm({
      name: site.name, domain: site.domain, description: site.description,
      status: site.status, primaryColor: site.theme.primaryColor, logo: site.theme.logo,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.domain) return;
    const site: Site = {
      id: editingSite?.id || generateId('site'),
      name: form.name,
      domain: form.domain,
      description: form.description,
      status: form.status,
      createdAt: editingSite?.createdAt || new Date().toISOString(),
      theme: { primaryColor: form.primaryColor, logo: form.logo },
    };
    saveSite(site);
    refresh();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除此子網站嗎？相關的使用者和資料也會被清除。')) {
      deleteSite(id);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">子網站管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有子網站的設定與狀態</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          新增子網站
        </button>
      </div>

      {/* Site Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map(site => (
          <div key={site.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
            <div className="h-2" style={{ backgroundColor: site.theme.primaryColor }} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: site.theme.primaryColor + '15' }}>
                    {site.theme.logo}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{site.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {site.domain}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  site.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {site.status === 'active' ? '運行中' : '已停用'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{site.description}</p>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => onSelectSite(site.id)}
                  className="flex-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  管理
                </button>
                <button onClick={() => openEdit(site)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(site.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingSite ? '編輯子網站' : '新增子網站'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">網站名稱 *</label>
                <input
                  type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：企業官網"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">網域 *</label>
                <input
                  type="text" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：www.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} placeholder="網站描述..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                <select
                  value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">運行中</option>
                  <option value="inactive">已停用</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主題色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, primaryColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${form.primaryColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">圖示</label>
                <div className="flex gap-2 flex-wrap">
                  {LOGOS.map(logo => (
                    <button
                      key={logo}
                      onClick={() => setForm({ ...form, logo })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-transform ${form.logo === logo ? 'border-blue-600 scale-110 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      {logo}
                    </button>
                  ))}
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
