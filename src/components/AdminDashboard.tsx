import { useState, useEffect } from 'react';
import { Page } from '../types';
import { getAdmins, getUsers, getSites } from '../database';
import { AdminUser, User, Site } from '../types';
import Dashboard from './Dashboard';
import SiteManager from './SiteManager';
import UserManager from './UserManager';
import MenuManager from './MenuManager';
import DataManager from './DataManager';
import SitePreview from './SitePreview';
import AccountManager from './AccountManager';
import {
  LayoutDashboard, Globe, Users, Menu, Database, Eye, LogOut, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

interface AdminDashboardProps {
  session: { type: 'admin' | 'user'; id: string };
  onLogout: () => void;
}

const menuItems: { key: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: 'dashboard', label: '儀表板', icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: 'accounts', label: '帳號管理', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { key: 'sites', label: '子網站管理', icon: <Globe className="w-5 h-5" />, adminOnly: true },
  { key: 'users', label: '使用者管理', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { key: 'menus', label: '功能表管理', icon: <Menu className="w-5 h-5" />, adminOnly: true },
  { key: 'data', label: '資料管理', icon: <Database className="w-5 h-5" />, adminOnly: true },
  { key: 'preview', label: '網站預覽', icon: <Eye className="w-5 h-5" /> },
];

export default function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [adminName, setAdminName] = useState('');
  const [userInfo, setUserInfo] = useState<User | null>(null);

  const isAdmin = session.type === 'admin';

  useEffect(() => {
    const loadData = async () => {
      const allSites = await getSites();
      setSites(allSites);
      
      if (isAdmin) {
        const admins = await getAdmins();
        const admin = admins.find(a => a.id === session.id);
        setAdminName(admin?.username || 'Admin');
      } else {
        const users = await getUsers();
        const user = users.find(u => u.id === session.id);
        setUserInfo(user || null);
      }
    };
    loadData();
  }, [session.id, isAdmin]);

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard selectedSiteId={selectedSiteId} isAdmin={isAdmin} session={session} />;
      case 'accounts':
        return <AccountManager />;
      case 'sites':
        return <SiteManager onSelectSite={setSelectedSiteId} />;
      case 'users':
        return <UserManager selectedSiteId={selectedSiteId} />;
      case 'menus':
        return <MenuManager selectedSiteId={selectedSiteId} />;
      case 'data':
        return <DataManager selectedSiteId={selectedSiteId} />;
      case 'preview':
        return <SitePreview selectedSiteId={selectedSiteId} />;
      default:
        return <Dashboard selectedSiteId={selectedSiteId} isAdmin={isAdmin} session={session} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold truncate">多子網站管理系統</h1>
                <p className="text-xs text-slate-400 truncate">
                  {isAdmin ? '超級管理員' : `${userInfo?.role || ''} - ${userInfo?.username || ''}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredMenuItems.map(item => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentPage === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-slate-700">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>收起側欄</span></>}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 text-sm transition-colors mt-1"
            title={collapsed ? '登出' : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>登出</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              {menuItems.find(m => m.key === currentPage)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <select
                value={selectedSiteId}
                onChange={e => setSelectedSiteId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部子網站</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                {isAdmin ? <Shield className="w-4 h-4 text-blue-600" /> : <span className="text-xs font-bold text-blue-600">{adminName?.[0]?.toUpperCase() || 'U'}</span>}
              </div>
              <span className="font-medium">{isAdmin ? adminName : userInfo?.username}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
