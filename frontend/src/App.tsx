import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import BandListPage from './features/bands/BandListPage'
import BandDetailPage from './features/bands/BandDetailPage'
import MySongsPage from './features/songs/MySongsPage'
import PublicSongsPage from './features/songs/PublicSongsPage'
import MyPlaylistsPage from './features/playlists/MyPlaylistsPage'
import PlaylistDetailPage from './features/playlists/PlaylistDetailPage'
import SettingsPage from './features/settings/SettingsPage'
import InviteAcceptPage from './features/bands/InviteAcceptPage'
import SongEditorPage from './features/editor/SongEditorPage'
import SongViewerPage from './features/viewer/SongViewerPage'
import ErrorBoundary from './components/ErrorBoundary'
import RequireAuth from './components/RequireAuth'
import { useAuthStore } from './stores/authStore'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <ErrorBoundary>
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
          path="/my-songs"
          element={
            <RequireAuth>
              <MySongsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/playlists"
          element={
            <RequireAuth>
              <MyPlaylistsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/playlists/:id"
          element={
            <RequireAuth>
              <PlaylistDetailPage />
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
          path="/songs/:id"
          element={
            <RequireAuth>
              <SongEditorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/songs/:id/view"
          element={
            <RequireAuth>
              <SongViewerPage />
            </RequireAuth>
          }
        />
        <Route
          path="/explore"
          element={
            <RequireAuth>
              <PublicSongsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
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
    </ErrorBoundary>
  )
}
