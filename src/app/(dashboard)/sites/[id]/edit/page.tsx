'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditSitePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [site, setSite] = useState<{ name: string; slug: string; description: string } | null>(null)

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/sites/${id}`)
        if (!res.ok) {
          setError('載入失敗')
          return
        }
        const data = await res.json()
        setSite(data)
      } catch {
        setError('網路錯誤')
      }
    }
    fetchSite()
  }, [id])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const res = await fetch(`/api/sites/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description')
      })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '更新失敗')
      setLoading(false)
    } else {
      router.push('/sites')
    }
  }

  if (!site && !error) {
    return <div className="p-6">載入中...</div>
  }

  if (error && !site) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">編輯子網站</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">網站名稱</label>
          <input
            name="name"
            required
            defaultValue={site?.name}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：XX都更案"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">網址代稱 (slug)</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            defaultValue={site?.slug}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：xx-urban-renewal"
          />
          <p className="text-xs text-gray-500 mt-1">僅允許小寫英文、數字和連字號</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={site?.description}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '更新中...' : '更新'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}