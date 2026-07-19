import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { playlistsApi, type PlaylistSummary } from '../../api/playlists'
import AppLayout from '../../components/AppLayout'

export default function MyPlaylistsPage() {
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    playlistsApi
      .list()
      .then((res) => setPlaylists(res.data.data.playlists))
      .catch((err) => setError(apiErrorMessage(err, '無法載入歌單')))
      .finally(() => setLoading(false))
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await playlistsApi.create(newName.trim())
      navigate(`/playlists/${res.data.data.playlist.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, '建立歌單失敗'))
      setCreating(false)
    }
  }

  const onDelete = async (p: PlaylistSummary) => {
    if (!window.confirm(`確定要刪除歌單「${p.name}」嗎?(不會刪到歌曲)`)) return
    setError('')
    try {
      await playlistsApi.remove(p.id)
      setPlaylists((prev) => prev.filter((x) => x.id !== p.id))
    } catch (err) {
      setError(apiErrorMessage(err, '刪除失敗'))
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">我的歌單</h2>
      </div>

      <form onSubmit={onCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="新歌單名稱(例:週五練團、婚禮場)"
          maxLength={200}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 max-w-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          建立歌單
        </button>
      </form>

      <p className="text-sm text-gray-400 mb-4">
        歌單是把你自己的歌曲挑選、排好順序的清單,適合練團或演出用。
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">載入中…</p>
      ) : playlists.length === 0 ? (
        <p className="text-gray-400">還沒有歌單,建立第一個吧!</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => navigate(`/playlists/${p.id}`)}
            >
              <h3 className="font-semibold text-gray-900 mb-1 pr-8 truncate">{p.name}</h3>
              <p className="text-sm text-gray-500">{p.songCount} 首歌</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void onDelete(p)
                }}
                className="absolute top-3 right-3 text-sm text-red-400 hover:text-red-600"
                title="刪除歌單"
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}
