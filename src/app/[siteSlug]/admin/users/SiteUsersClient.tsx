'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  userId: number;
  name: string;
  email: string;
  siteRole: string;
  createdAt: string;
}

export default function SiteUsersClient({ siteSlug, initial }: { siteSlug: string; initial: Member[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    const res = await fetch(`/api/${siteSlug}/admin/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, password: password || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '邀請失敗');
      return;
    }
    setMsg(data.tempPassword ? `已建立，臨時密碼: ${data.tempPassword}` : '已邀請');
    setEmail('');
    setName('');
    setPassword('');
    // reload members
    const r2 = await fetch(`/api/${siteSlug}/admin/users`);
    if (r2.ok) {
      const list = await r2.json();
      setMembers(list.map((x: { user: { id: number; name: string; email: string; createdAt: string }; siteRole: string }) => ({
        userId: x.user.id,
        name: x.user.name,
        email: x.user.email,
        siteRole: x.siteRole,
        createdAt: x.user.createdAt,
      })));
    }
    router.refresh();
  }

  async function handleRemove(userId: number) {
    if (!confirm('確定移除此成員？')) return;
    const res = await fetch(`/api/${siteSlug}/admin/users?userId=${userId}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers(members.filter((m) => m.userId !== userId));
      router.refresh();
    }
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm">姓名</th>
              <th className="px-4 py-2 text-left text-sm">Email</th>
              <th className="px-4 py-2 text-left text-sm">站內角色</th>
              <th className="px-4 py-2 text-right text-sm">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.userId}>
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2 text-gray-500">{m.email}</td>
                <td className="px-4 py-2">{m.siteRole}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleRemove(m.userId)} className="text-red-600 hover:underline text-sm">
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="p-4 text-center text-gray-500">尚無成員</div>}
      </div>

      <form onSubmit={handleInvite} className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">邀請成員</h3>
        {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        {msg && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">{msg}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">站內角色</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密碼 (選填，自動產生)</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="留空自動產生" />
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          邀請
        </button>
      </form>
    </div>
  );
}
