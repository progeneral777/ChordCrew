import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">載入中…</div>
    )
  }
  if (status === 'anon') return <Navigate to="/login" replace />
  return <>{children}</>
}
