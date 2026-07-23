import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

// 導覽列膠囊樣式:選中時填靛紫底,否則灰字
const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
  }`

export default function AppLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const initial = user?.displayName?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-lg shadow-md shadow-indigo-500/25">
                ♪
              </span>
              <span className="text-lg font-bold text-gradient tracking-tight">BandSheet</span>
            </Link>
            {user && (
              <nav className="hidden sm:flex items-center gap-1">
                <NavLink to="/" end className={navClass}>
                  我的樂團
                </NavLink>
                <NavLink to="/my-songs" className={navClass}>
                  我的歌曲
                </NavLink>
                <NavLink to="/playlists" className={navClass}>
                  我的歌單
                </NavLink>
                <NavLink to="/explore" className={navClass}>
                  探索
                </NavLink>
              </nav>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/settings"
                title="個人設定"
                className="flex items-center gap-2 rounded-full pr-1 hover:bg-slate-100 transition"
              >
                <span className="grid place-items-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-semibold">
                  {initial}
                </span>
                <span className="hidden md:block text-sm text-slate-600 max-w-[8rem] truncate">
                  {user.displayName}
                </span>
              </Link>
              <button type="button" onClick={() => void logout()} className="btn-ghost">
                登出
              </button>
            </div>
          )}
        </div>
        {/* 手機版導覽 */}
        {user && (
          <nav className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
            <NavLink to="/" end className={navClass}>
              我的樂團
            </NavLink>
            <NavLink to="/my-songs" className={navClass}>
              我的歌曲
            </NavLink>
            <NavLink to="/playlists" className={navClass}>
              我的歌單
            </NavLink>
            <NavLink to="/explore" className={navClass}>
              探索
            </NavLink>
          </nav>
        )}
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
