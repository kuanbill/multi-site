'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleSelect({
  id,
  currentRole,
  disabled = false,
}: {
  id: number
  currentRole: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function changeRole(nextRole: string) {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || '更新失敗')
      setRole(currentRole)
      return
    }
    setRole(nextRole)
    router.refresh()
  }

  return (
    <div className="inline-flex flex-col items-start">
      <select
        value={role}
        disabled={disabled || saving}
        onChange={(event) => changeRole(event.target.value)}
        className="px-2 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
        aria-label="角色"
      >
        <option value="admin">管理員</option>
        <option value="editor">編輯者</option>
        <option value="viewer">檢視者</option>
      </select>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </div>
  )
}
