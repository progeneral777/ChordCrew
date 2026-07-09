import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import RequireAuth from './components/RequireAuth'
import { useAuthStore } from './stores/authStore'

function HomePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">BandSheet</h1>
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
      <main className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">
        即時共編和弦進行譜與歌詞譜 — 樂團功能即將登場
      </main>
    </div>
  )
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
