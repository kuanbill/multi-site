import { useState, useEffect } from 'react';
import { getSites, getUsers, getMenus, getCollections, getRecords, exportDatabase, importDatabase } from '../database';
import { Site, User, MenuItem, DataCollection, DataRecord } from '../types';
import { Globe, Users, Menu, Database, TrendingUp, Activity, Download, Upload, HardDrive } from 'lucide-react';

interface DashboardProps {
  selectedSiteId: string;
  isAdmin: boolean;
  session: { type: 'admin' | 'user'; id: string };
}

export default function Dashboard({ selectedSiteId }: DashboardProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [records, setRecords] = useState<DataRecord[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [allSites, allUsers, allMenus, allCollections, allRecords] = await Promise.all([
        getSites(),
        getUsers(),
        getMenus(),
        getCollections(),
        getRecords(),
      ]);
      setSites(allSites);
      setUsers(allUsers);
      setMenus(allMenus);
      setCollections(allCollections);
      setRecords(allRecords);
    };
    loadData();
  }, []);

  const filteredSites = selectedSiteId ? sites.filter(s => s.id === selectedSiteId) : sites;
  const filteredUsers = selectedSiteId ? users.filter(u => u.siteId === selectedSiteId) : users;
  const filteredMenus = selectedSiteId ? menus.filter(m => m.siteId === selectedSiteId) : menus;
  const filteredCollections = selectedSiteId ? collections.filter(c => c.siteId === selectedSiteId) : collections;
  const filteredRecords = selectedSiteId ? records.filter(r => r.siteId === selectedSiteId) : records;

  const stats = [
    { label: '子網站', value: filteredSites.length, icon: <Globe className="w-6 h-6" />, color: 'bg-blue-500', change: '+2 本月' },
    { label: '使用者', value: filteredUsers.length, icon: <Users className="w-6 h-6" />, color: 'bg-green-500', change: `${filteredUsers.filter(u => u.status === 'active').length} 活躍` },
    { label: '功能表項目', value: filteredMenus.length, icon: <Menu className="w-6 h-6" />, color: 'bg-purple-500', change: `${filteredMenus.filter(m => m.visible).length} 顯示中` },
    { label: '資料筆數', value: filteredRecords.length, icon: <Database className="w-6 h-6" />, color: 'bg-orange-500', change: `${filteredCollections.length} 集合` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">系統概覽</h1>
        {selectedSiteId && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            {sites.find(s => s.id === selectedSiteId)?.name}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Site List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">子網站狀態</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredSites.map(site => (
            <div key={site.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: site.theme.primaryColor + '20' }}>
                  {site.theme.logo}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{site.name}</h4>
                  <p className="text-sm text-gray-500">{site.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">{users.filter(u => u.siteId === site.id).length} 位使用者</p>
                  <p className="text-xs text-gray-400">{menus.filter(m => m.siteId === site.id).length} 個選單項目</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  site.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {site.status === 'active' ? '運行中' : '已停用'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">資料庫管理</h3>
          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">IndexedDB</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{sites.length}</p>
              <p className="text-xs text-gray-500">子網站</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{users.length}</p>
              <p className="text-xs text-gray-500">使用者</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{collections.length}</p>
              <p className="text-xs text-gray-500">資料集合</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{records.length}</p>
              <p className="text-xs text-gray-500">資料記錄</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const data = await exportDatabase();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              匯出資料庫
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              匯入資料庫
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!confirm('匯入將覆蓋所有現有資料，確定要繼續嗎？')) return;
                  const text = await file.text();
                  await importDatabase(text);
                  window.location.reload();
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">最近使用者</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredUsers.slice(0, 5).map(user => (
              <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  user.role === 'admin' ? 'bg-red-100 text-red-700' :
                  user.role === 'editor' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">資料集合</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredCollections.map(col => (
              <div key={col.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{col.name}</p>
                  <p className="text-xs text-gray-500">{col.description}</p>
                </div>
                <span className="text-sm text-gray-600">
                  {records.filter(r => r.collection === col.id).length} 筆
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
