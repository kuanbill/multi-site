import { useState, useEffect } from 'react';
import { initializeDatabase, getSession, setSession } from './database';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setCurrentSession] = useState<{ type: 'admin' | 'user'; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      const s = await getSession();
      if (s) {
        setIsLoggedIn(true);
        setCurrentSession(s);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (type: 'admin' | 'user', id: string) => {
    const s = { type, id };
    await setSession(s);
    setCurrentSession(s);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await setSession(null);
    setCurrentSession(null);
    setIsLoggedIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <AdminDashboard session={session!} onLogout={handleLogout} />;
}
