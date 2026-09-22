'use client'

import { useRouter } from 'next/navigation'

export default function ToggleRoleButton({
  id,
  currentRole
}: {
  id: number
  currentRole: string
}) {
  const router = useRouter()

  async function toggleRole() {
    const newRole = currentRole === 'admin' ? 'editor' : 'admin'

    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })

    router.refresh()
  }

  return (
    <button
      onClick={toggleRole}
      className="text-blue-600 hover:underline"
    >
      {currentRole === 'admin' ? '改為編輯者' : '升為管理員'}
    </button>
  )
}
