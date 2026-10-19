'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roleLabel, ROLE_VALUES } from '@/lib/roles';

interface Member {
  userId: number;
  name: string;
  email: string;
  phone: string;
  siteRole: string;
  createdAt: string;
}

interface ImportResultData {
  created: Array<{ email: string; name: string; phone: string; password: string; generated: boolean }>;
  skipped: Array<{ email: string; reason: string }>;
  errors: Array<{ rowNumber: number; email: string; reason: string }>;
}

export default function SiteUsersClient({
  siteSlug,
  initial,
  canManage,
  canManageAdmins,
}: {
  siteSlug: string;
  initial: Member[];
  canManage: boolean;
  canManageAdmins: boolean;
}) {
  const router = useRouter();
  const assignableRoles = canManageAdmins ? ROLE_VALUES : ROLE_VALUES.filter((value) => value !== 'admin');
  const [members, setMembers] = useState(initial);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('editor');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [downloadingResult, setDownloadingResult] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function refreshMembers() {
    const r2 = await fetch(`/api/${siteSlug}/admin/users`);
    if (r2.ok) {
      const list = await r2.json();
      setMembers(
        list.map((x: { user: { id: number; name: string; email: string; phone?: string | null; createdAt: string }; siteRole: string }) => ({
          userId: x.user.id,
          name: x.user.name,
          email: x.user.email,
          phone: x.user.phone ?? '',
          siteRole: x.siteRole,
          createdAt: x.user.createdAt,
        })),
      );
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    const res = await fetch(`/api/${siteSlug}/admin/users/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone, role: 'viewer', password: password || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '新增失敗');
      return;
    }
    setMsg(data.tempPassword ? `已建立，臨時密碼: ${data.tempPassword}` : '已新增');
    setEmail('');
    setName('');
    setPhone('');
    setPassword('');
    await refreshMembers();
    router.refresh();
  }

  async function handleImport() {
    if (!importFile) {
      setImportError('請先選擇 Excel 檔案');
      return;
    }
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', importFile);
      const res = await fetch(`/api/${siteSlug}/admin/users/import`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || '匯入失敗');
        return;
      }
      setImportResult(data as ImportResultData);
      setImportFile(null);
      if (importInputRef.current) importInputRef.current.value = '';
      await refreshMembers();
      router.refresh();
    } catch {
      setImportError('網路錯誤，請重試');
    } finally {
      setImporting(false);
    }
  }

  async function downloadImportResult() {
    if (!importResult) return;
    setDownloadingResult(true);
    setImportError('');
    try {
      const res = await fetch(`/api/${siteSlug}/admin/users/import/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importResult),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setImportError(data?.error || '下載結果檔失敗');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'member-import-result.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setImportError('下載結果檔失敗');
    } finally {
      setDownloadingResult(false);
    }
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
    setEditPhone(m.phone);
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
        phone: editPhone,
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
          ? { ...m, name: data.user.name, email: data.user.email, phone: data.user.phone ?? '', siteRole: data.siteRole }
          : m,
      ),
    );
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      {editError && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{editError}</div>}
      <div className="mb-6 overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm">姓名</th>
              <th className="px-4 py-2 text-left text-sm">Email</th>
              <th className="px-4 py-2 text-left text-sm">手機</th>
              <th className="px-4 py-2 text-left text-sm">站內角色</th>
              {canManage && <th className="px-4 py-2 text-right text-sm">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) =>
              editingId === m.userId ? (
                <tr key={m.userId} className="bg-blue-50">
                  <td className="px-4 py-2">
                     <input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                  </td>
                  <td className="px-4 py-2">
                     <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                  </td>
                  <td className="px-4 py-2">
                     <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="選填" className="min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
                  </td>
                  <td className="px-4 py-2">
                     <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="min-h-11 rounded border px-2 py-1 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      {assignableRoles.map((value) => (
                        <option key={value} value={value}>{roleLabel(value)}</option>
                      ))}
                    </select>
                    <input
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="新密碼（留空不變更）"
                       className="mt-1 min-h-11 w-full rounded border px-2 py-1 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                    <button
                      onClick={() => handleEdit(m.userId)}
                      disabled={editSaving}
                      className="inline-flex min-h-11 items-center rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editSaving ? '儲存中...' : '儲存'}
                    </button>
                    <button onClick={cancelEdit} className="inline-flex min-h-11 items-center text-sm text-gray-600 hover:underline">
                      取消
                    </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={m.userId}>
                   <td className="max-w-[14rem] break-words px-4 py-2">{m.name}</td>
                   <td className="max-w-[18rem] break-all px-4 py-2 text-gray-500">{m.email}</td>
                   <td className="break-all px-4 py-2 text-gray-500">{m.phone}</td>
                  <td className="px-4 py-2">{roleLabel(m.siteRole)}</td>
                  {canManage && (
                   <td className="px-4 py-2">
                      {m.siteRole === 'admin' && !canManageAdmins ? (
                        <span className="text-gray-400 text-sm">僅站點管理員可變更</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                           <button onClick={() => startEdit(m)} className="inline-flex min-h-11 items-center text-sm text-blue-600 hover:underline">
                            修改
                          </button>
                           <button onClick={() => handleRemove(m.userId)} className="inline-flex min-h-11 items-center text-sm text-red-600 hover:underline">
                            移除
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
        </div>
        {members.length === 0 && <div className="p-4 text-center text-gray-500">尚無成員</div>}
      </div>

      {canManage && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
          <div>
            <h3 className="font-medium">匯入 Excel 成員</h3>
            <p className="text-sm text-gray-500">
              依範本填寫 Email、姓名、手機；角色一律預設為檢視者，密碼由系統產生 6 碼英數。
            </p>
          </div>
          {importError && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{importError}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/${siteSlug}/admin/users/import/template`}
               className="inline-flex min-h-11 items-center rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
            >
              下載範本
            </a>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
               className="min-h-11 min-w-0 max-w-full text-base sm:text-sm"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
               className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? '匯入中...' : '匯入'}
            </button>
          </div>

          {importResult && (
            <div className="space-y-4">
              <div
                className={`p-2 rounded text-sm ${
                  importResult.errors.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                匯入完成：新增 {importResult.created.length} 筆、略過 {importResult.skipped.length} 筆、失敗{' '}
                {importResult.errors.length} 筆
              </div>

              {importResult.created.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">新增成功（站內角色：檢視者）</h4>
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">姓名</th>
                          <th className="px-3 py-2 text-left">手機</th>
                          <th className="px-3 py-2 text-left">密碼</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importResult.created.map((row) => (
                          <tr key={`created-${row.email}`}>
                            <td className="px-3 py-2">{row.email}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.phone}</td>
                            <td className="px-3 py-2 font-mono">
                              {row.generated ? row.password : '沿用原密碼'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    密碼為系統產生的 6 碼英數，請轉發給成員並提醒登入後修改。
                  </p>
                </div>
              )}

              {importResult.skipped.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">略過</h4>
                  <ul className="text-sm text-gray-600 list-disc pl-5">
                    {importResult.skipped.map((row) => (
                      <li key={`skipped-${row.email}`}>
                        {row.email} — {row.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-red-700">失敗</h4>
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">列</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importResult.errors.map((row, index) => (
                          <tr key={`error-${index}-${row.email}`}>
                            <td className="px-3 py-2">{row.rowNumber}</td>
                            <td className="px-3 py-2">{row.email}</td>
                            <td className="px-3 py-2 text-red-700">{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={downloadImportResult}
                disabled={downloadingResult}
                 className="inline-flex min-h-11 items-center rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {downloadingResult ? '產生中...' : '下載結果檔（含密碼）'}
              </button>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleInvite} className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="font-medium">新增成員</h3>
          {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          {msg && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">{msg}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">姓名</label>
               <input value={name} onChange={(e) => setName(e.target.value)} required className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
               <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">手機 (選填)</label>
               <input value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" placeholder="09xxxxxxxx" />
            </div>
            <div>
              <p className="text-sm font-medium">站內角色：檢視者（固定）</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">密碼 (選填，自動產生)</label>
               <input value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" placeholder="留空自動產生" />
            </div>
          </div>
           <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            新增
          </button>
        </form>
      )}
    </div>
  );
}
