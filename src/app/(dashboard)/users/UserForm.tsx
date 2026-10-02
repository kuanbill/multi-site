'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_VALUES, roleLabel } from '@/lib/roles'

type SiteOption = {
  id: number
  name: string
}

type UserFormProps = {
  user?: {
    id: number
    name: string
    email: string
    role: string
  }
  sites?: SiteOption[]
  initialSite?: {
    siteId: number | null
    siteRole: string
  }
}

export default function UserForm({ user, sites = [], initialSite }: UserFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(user?.role || 'editor')
  const [siteId, setSiteId] = useState(initialSite?.siteId ? String(initialSite.siteId) : '')
  const [siteRole, setSiteRole] = useState(initialSite?.siteRole || 'editor')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const response = await fetch(user ? `/api/users/${user.id}` : '/api/users', {
      method: user ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role,
        siteId: siteId ? Number(siteId) : null,
        siteRole
      })
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || '儲存失敗')
      setLoading(false)
      return
    }

    router.push('/users')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">{user ? '編輯使用者' : '新增使用者'}</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">姓名</label>
          <input name="name" required defaultValue={user?.name} className="w-full px-3 py-2 border rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">電子郵件</label>
          <input name="email" type="email" required defaultValue={user?.email} className="w-full px-3 py-2 border rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">密碼{user ? '（留空代表不修改）' : ''}</label>
          <input name="password" type="password" minLength={6} required={!user} className="w-full px-3 py-2 border rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">角色</label>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {ROLE_VALUES.map((value) => (
              <option key={value} value={value}>{roleLabel(value)}</option>
            ))}
          </select>
        </div>

        {role === 'admin' ? (
          <p className="text-sm text-gray-500">全域管理員可管理所有子網站，不需指定單一子網站。</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">管理子網站</label>
              <select
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">不指定</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">子網站角色</label>
              <select
                value={siteRole}
                disabled={!siteId}
                onChange={(event) => setSiteRole(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
              >
                {ROLE_VALUES.map((value) => (
                  <option key={value} value={value}>{roleLabel(value)}</option>
                ))}
              </select>
            </div>

            <p className="col-span-2 text-xs text-gray-500">一位站點帳號僅能指定一個子網站（全域管理員除外）。</p>
          </div>
        )}

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {loading ? '儲存中...' : '儲存'}
          </button>
          <button type="button" onClick={() => router.push('/users')} className="px-4 py-2 border rounded-lg">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
