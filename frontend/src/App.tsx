import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import BandListPage from './features/bands/BandListPage'
import BandDetailPage from './features/bands/BandDetailPage'
import InviteAcceptPage from './features/bands/InviteAcceptPage'
import RequireAuth from './components/RequireAuth'
import { useAuthStore } from './stores/authStore'

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
              <BandListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bands/:id"
          element={
            <RequireAuth>
              <BandDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/invites/:token"
          element={
            <RequireAuth>
              <InviteAcceptPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
