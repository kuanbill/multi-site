import { useState } from 'react';
import { validateAdmin, getUsers, getSites } from '../store';
import { Shield, User, Globe, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (type: 'admin' | 'user', id: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [tab, setTab] = useState<'admin' | 'user'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'admin') {
      const admin = validateAdmin(username, password);
      if (admin) {
        onLogin('admin', admin.id);
      } else {
        setError('管理員帳號或密碼錯誤');
      }
    } else {
      const users = getUsers();
      const user = users.find(u => u.username === username && u.password === password && u.siteId === selectedSiteId);
      if (user) {
        onLogin('user', user.id);
      } else {
        setError('使用者帳號或密碼錯誤，或未選擇正確的子網站');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">多子網站管理系統</h1>
          <p className="text-blue-200 mt-2">Multi-Site Management Platform</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => { setTab('admin'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              管理員登入
            </button>
            <button
              onClick={() => { setTab('user'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-200 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              使用者登入
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'user' && (
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1.5">選擇子網站</label>
                <select
                  value={selectedSiteId}
                  onChange={e => setSelectedSiteId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" className="bg-slate-800">請選擇子網站</option>
                  {getSites().map(site => (
                    <option key={site.id} value={site.id} className="bg-slate-800">
                      {site.name} ({site.domain})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">帳號</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1.5">密碼</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              登入
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-blue-300/70 text-xs text-center">
              {tab === 'admin' 
                ? '預設帳號: admin / admin123' 
                : '測試帳號: editor1/pass123 (企業官網) 或 shop_admin/pass123 (電商平台)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
