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
        <h2 className="text-2xl font-bold text-slate-900">我的歌單</h2>
      </div>

      <form onSubmit={onCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="新歌單名稱(例:週五練團、婚禮場)"
          maxLength={200}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input flex-1 max-w-sm"
        />
        <button type="submit" disabled={creating || !newName.trim()} className="btn-primary">
          建立歌單
        </button>
      </form>

      <p className="text-sm text-slate-400 mb-4">
        歌單是把你自己的歌曲挑選、排好順序的清單,適合練團或演出用。
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-slate-400">載入中…</p>
      ) : playlists.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">還沒有歌單,建立第一個吧!</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="card card-hover p-5 cursor-pointer relative flex items-start gap-3"
              onClick={() => navigate(`/playlists/${p.id}`)}
            >
              <span className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-lg shrink-0">
                ♫
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 mb-0.5 pr-8 truncate">{p.name}</h3>
                <p className="text-sm text-slate-500">{p.songCount} 首歌</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void onDelete(p)
                }}
                className="absolute top-3 right-3 text-sm text-slate-300 hover:text-red-500"
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
