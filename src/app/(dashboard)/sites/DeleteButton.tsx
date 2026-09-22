'use client'

import { useRouter } from 'next/navigation'

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('確定要刪除此子網站嗎？')) return

    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:underline"
    >
      刪除
    </button>
  )
}