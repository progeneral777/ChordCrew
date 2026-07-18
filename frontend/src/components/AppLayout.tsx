import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`

export default function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-gray-900">
              BandSheet
            </Link>
            {user && (
              <nav className="flex items-center gap-4">
                <NavLink to="/" end className={navClass}>
                  我的樂團
                </NavLink>
                <NavLink to="/my-songs" className={navClass}>
                  我的歌曲
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.displayName}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
