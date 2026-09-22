'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserFormProps = {
  user?: {
    id: number
    name: string
    email: string
    role: string
  }
}

export default function UserForm({ user }: UserFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        role: formData.get('role')
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
          <select name="role" defaultValue={user?.role || 'editor'} className="w-full px-3 py-2 border rounded-lg">
            <option value="editor">編輯者</option>
            <option value="admin">管理員</option>
          </select>
        </div>

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
