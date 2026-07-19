import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { playlistsApi, type PlaylistDetail } from '../../api/playlists'
import { songsApi, type SongSummary } from '../../api/songs'
import AppLayout from '../../components/AppLayout'

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [mySongs, setMySongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([playlistsApi.get(id), songsApi.listMine()])
      .then(([p, s]) => {
        setPlaylist(p.data.data.playlist)
        setNameInput(p.data.data.playlist.name)
        setMySongs(s.data.data.songs)
      })
      .catch((err) => setError(apiErrorMessage(err, '無法載入歌單')))
      .finally(() => setLoading(false))
  }, [id])

  const availableSongs = useMemo(() => {
    if (!playlist) return []
    const inList = new Set(playlist.songs.map((s) => s.id))
    return mySongs.filter((s) => !inList.has(s.id))
  }, [mySongs, playlist])

  const apply = (p: PlaylistDetail) => {
    setPlaylist(p)
    setNameInput(p.name)
  }

  const onRename = async () => {
    if (!id || !nameInput.trim()) return
    setError('')
    try {
      const res = await playlistsApi.rename(id, nameInput.trim())
      apply(res.data.data.playlist)
      setEditingName(false)
    } catch (err) {
      setError(apiErrorMessage(err, '重新命名失敗'))
    }
  }

  const onAdd = async (songId: string) => {
    if (!id) return
    setError('')
    try {
      const res = await playlistsApi.addSong(id, songId)
      apply(res.data.data.playlist)
    } catch (err) {
      setError(apiErrorMessage(err, '加入歌曲失敗'))
    }
  }

  const onRemove = async (songId: string) => {
    if (!id) return
    setError('')
    try {
      const res = await playlistsApi.removeSong(id, songId)
      apply(res.data.data.playlist)
    } catch (err) {
      setError(apiErrorMessage(err, '移除歌曲失敗'))
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    if (!id || !playlist) return
    const j = index + dir
    if (j < 0 || j >= playlist.songs.length) return
    const ids = playlist.songs.map((s) => s.id)
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    // 樂觀更新順序
    const reordered = [...playlist.songs]
    ;[reordered[index], reordered[j]] = [reordered[j], reordered[index]]
    setPlaylist({ ...playlist, songs: reordered })
    try {
      const res = await playlistsApi.reorder(id, ids)
      apply(res.data.data.playlist)
    } catch (err) {
      setError(apiErrorMessage(err, '排序失敗'))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-gray-400">載入中…</p>
      </AppLayout>
    )
  }

  if (!playlist) {
    return (
      <AppLayout>
        <p className="text-red-600">{error || '找不到歌單'}</p>
        <Link to="/playlists" className="text-blue-600 hover:underline text-sm">
          回歌單列表
        </Link>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Link to="/playlists" className="text-sm text-blue-600 hover:underline">
        ← 我的歌單
      </Link>

      <div className="flex items-center justify-between mt-1 mb-5 gap-3 flex-wrap">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-lg"
            />
            <button
              type="button"
              onClick={() => void onRename()}
              className="text-sm bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={() => {
                setNameInput(playlist.name)
                setEditingName(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              取消
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{playlist.name}</h2>
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              改名
            </button>
          </div>
        )}
        <span className="text-sm text-gray-500">{playlist.songs.length} 首歌</span>
      </div>

      {availableSongs.length > 0 && (
        <div className="mb-4">
          <select
            value=""
            onChange={(e) => e.target.value && void onAdd(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-2 bg-white text-blue-600"
          >
            <option value="">＋ 從我的歌曲加入…</option>
            {availableSongs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.originalKey ? ` (${s.originalKey})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {playlist.songs.length === 0 ? (
        <p className="text-gray-400">
          歌單還是空的。用上方「＋ 從我的歌曲加入」把歌加進來,再排順序。
        </p>
      ) : (
        <ol className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {playlist.songs.map((song, idx) => (
            <li key={song.id} className="px-4 py-3 flex items-center gap-3">
              <span className="w-6 text-right text-sm text-gray-400 tabular-nums">{idx + 1}</span>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <p className="font-medium text-gray-900 truncate">{song.title}</p>
                <p className="text-sm text-gray-500 truncate">
                  {[song.artist, song.originalKey, song.bpm && `${song.bpm} BPM`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => void move(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => void move(idx, 1)}
                  disabled={idx === playlist.songs.length - 1}
                  className="w-7 h-7 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                  title="下移"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/songs/${song.id}/view`)}
                  className="text-sm text-blue-600 hover:underline ml-1"
                >
                  檢視
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove(song.id)}
                  className="text-sm text-red-500 hover:text-red-700 ml-1"
                >
                  移除
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </AppLayout>
  )
}
