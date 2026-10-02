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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('editor');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

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

  function startEdit(m: Member) {
    setEditingId(m.userId);
    setEditName(m.name);
    setEditEmail(m.email);
    setEditRole(m.siteRole);
    setEditPassword('');
    setEditError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError('');
  }

  async function handleEdit(userId: number) {
    setEditSaving(true);
    setEditError('');
    const res = await fetch(`/api/${siteSlug}/admin/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name: editName,
        email: editEmail,
        role: editRole,
        password: editPassword || undefined,
      }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) {
      setEditError(data.error || '更新失敗');
      return;
    }
    setMembers(
      members.map((m) =>
        m.userId === userId
          ? { ...m, name: data.user.name, email: data.user.email, siteRole: data.siteRole }
          : m,
      ),
    );
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      {editError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{editError}</div>}
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
            {members.map((m) =>
              editingId === m.userId ? (
                <tr key={m.userId} className="bg-blue-50">
                  <td className="px-4 py-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-2 py-1 border rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-2 py-1 border rounded" />
                  </td>
                  <td className="px-4 py-2">
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="px-2 py-1 border rounded text-sm">
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                    <input
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="新密碼（留空不變更）"
                      className="mt-1 w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(m.userId)}
                      disabled={editSaving}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editSaving ? '儲存中...' : '儲存'}
                    </button>
                    <button onClick={cancelEdit} className="ml-2 text-gray-600 hover:underline text-sm">
                      取消
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={m.userId}>
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2 text-gray-500">{m.email}</td>
                  <td className="px-4 py-2">{m.siteRole}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => startEdit(m)} className="text-blue-600 hover:underline text-sm">
                      修改
                    </button>
                    <button onClick={() => handleRemove(m.userId)} className="ml-3 text-red-600 hover:underline text-sm">
                      移除
                    </button>
                  </td>
                </tr>
              ),
            )}
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
