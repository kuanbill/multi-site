'use client'

import { useRouter } from 'next/navigation'

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('確定要刪除此子網站嗎？')) return

    await fetch(`/api/admin/sites/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
       className="inline-flex min-h-11 items-center text-red-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      刪除
    </button>
  )
}
