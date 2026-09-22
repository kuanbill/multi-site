'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteUserButton({ id }: { id: number }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('確定要刪除此使用者嗎？')) return

    setLoading(true)
    setError('')
    const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || '刪除失敗')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={handleDelete} disabled={loading} className="text-red-600 hover:underline disabled:opacity-50">
        {loading ? '刪除中...' : '刪除'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
