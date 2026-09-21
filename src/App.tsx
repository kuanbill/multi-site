import { useState, useEffect } from 'react';
import { initializeStore, getSession, setSession } from './store';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setCurrentSession] = useState<{ type: 'admin' | 'user'; id: string } | null>(null);

  useEffect(() => {
    initializeStore();
    const s = getSession();
    if (s) {
      setIsLoggedIn(true);
      setCurrentSession(s);
    }
  }, []);

  const handleLogin = (type: 'admin' | 'user', id: string) => {
    const s = { type, id };
    setSession(s);
    setCurrentSession(s);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setSession(null);
    setCurrentSession(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <AdminDashboard session={session!} onLogout={handleLogout} />;
}
