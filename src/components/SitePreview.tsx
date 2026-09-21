import { useState } from 'react';
import { getSites, getMenusBySite, getCollectionsBySite, getRecordsByCollection } from '../store';
import { Eye, ExternalLink, Globe, ArrowLeft } from 'lucide-react';

interface SitePreviewProps {
  selectedSiteId: string;
}

export default function SitePreview({ selectedSiteId }: SitePreviewProps) {
  const sites = getSites();
  const [activeSiteId, setActiveSiteId] = useState(selectedSiteId || sites[0]?.id || '');
  const site = sites.find(s => s.id === activeSiteId);
  const menus = activeSiteId ? getMenusBySite(activeSiteId).filter(m => m.visible) : [];
  const collections = activeSiteId ? getCollectionsBySite(activeSiteId) : [];

  // Get records for display
  const allRecords = collections.flatMap(col =>
    getRecordsByCollection(col.id).map(r => ({ ...r, collectionName: col.name, fields: col.fields }))
  );

  if (!site) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>請先選擇一個子網站來預覽</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">網站預覽</h1>
          <p className="text-sm text-gray-500 mt-1">預覽子網站的首頁效果</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeSiteId}
            onChange={e => setActiveSiteId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            <ExternalLink className="w-4 h-4" />
            新視窗開啟
          </button>
        </div>
      </div>

      {/* Browser Frame */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
        {/* Browser Chrome */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-md border border-gray-300 text-sm text-gray-600 max-w-md w-full">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">{site.domain}</span>
            </div>
          </div>
        </div>

        {/* Site Preview */}
        <div className="min-h-[600px]" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {/* Site Header */}
          <header className="border-b border-gray-200" style={{ backgroundColor: site.theme.primaryColor }}>
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{site.theme.logo}</span>
                <h1 className="text-xl font-bold text-white">{site.name}</h1>
              </div>
              <nav className="flex items-center gap-1">
                {menus.map(menu => (
                  <a
                    key={menu.id}
                    href="#"
                    className="px-3 py-1.5 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    {menu.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>

          {/* Hero Section */}
          <section className="py-16 px-6" style={{ background: `linear-gradient(135deg, ${site.theme.primaryColor}15, ${site.theme.primaryColor}05)` }}>
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">歡迎來到 {site.name}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">{site.description}</p>
              <button
                className="px-6 py-3 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: site.theme.primaryColor }}
              >
                了解更多
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">特色功能</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {menus.slice(0, 3).map((menu, i) => (
                  <div key={menu.id} className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow text-center">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto mb-4"
                      style={{ backgroundColor: site.theme.primaryColor }}
                    >
                      {i === 0 ? '🚀' : i === 1 ? '💡' : '🎯'}
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-2">{menu.label}</h4>
                    <p className="text-sm text-gray-500">提供優質的{menu.label}體驗，滿足您的各種需求</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Data Section */}
          {allRecords.length > 0 && (
            <section className="py-12 px-6 bg-gray-50">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">最新資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allRecords.slice(0, 6).map(record => (
                    <div key={record.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <span className="text-xs text-gray-400 mb-2 block">{record.collectionName}</span>
                      <h4 className="font-medium text-gray-800 mb-2">
                        {record.data.title || record.data.name || '資料項目'}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {record.data.content || record.data.description || Object.values(record.data).filter(v => typeof v === 'string').join(', ')}
                      </p>
                      {record.data.publishDate && (
                        <p className="text-xs text-gray-400 mt-2">{record.data.publishDate}</p>
                      )}
                      {record.data.price && (
                        <p className="text-sm font-bold mt-2" style={{ color: site.theme.primaryColor }}>
                          NT$ {Number(record.data.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-8 px-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{site.theme.logo}</span>
                <span className="font-medium">{site.name}</span>
              </div>
              <p className="text-sm text-gray-400">© 2026 {site.name}. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Site Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          網站資訊
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">網站名稱</p>
            <p className="text-sm font-medium text-gray-800">{site.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">網域</p>
            <p className="text-sm font-medium text-gray-800">{site.domain}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">狀態</p>
            <p className="text-sm font-medium">
              <span className={site.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                {site.status === 'active' ? '運行中' : '已停用'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">功能表項目</p>
            <p className="text-sm font-medium text-gray-800">{menus.length} 個</p>
          </div>
        </div>
      </div>
    </div>
  );
}
