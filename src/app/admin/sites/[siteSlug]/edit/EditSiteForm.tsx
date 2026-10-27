'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EditableSite = {
  id: number
  name: string
  slug: string
  description: string
}

export default function EditSiteForm({ site }: { site: EditableSite }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const res = await fetch(`/api/admin/sites/${site.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description'),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '更新失敗')
      setLoading(false)
    } else {
      router.push('/admin/sites')
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold">編輯子網站</h2>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium">網站名稱</label>
          <input
            name="name"
            required
            defaultValue={site.name}
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：XX都更案"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">網址代稱 (slug)</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            defaultValue={site.slug}
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：xx-urban-renewal"
          />
          <p className="mt-1 text-xs text-gray-500">僅允許小寫英文、數字和連字號</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">描述</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={site.description}
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '更新中...' : '更新'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
