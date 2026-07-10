import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage, type Role } from '../../api/bands'
import { songsApi, type SongSummary } from '../../api/songs'

interface SongsPanelProps {
  bandId: string
  myRole: Role
}

export default function SongsPanel({ bandId, myRole }: SongsPanelProps) {
  const navigate = useNavigate()
  const canEdit = myRole === 'OWNER' || myRole === 'EDITOR'

  const [songs, setSongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<'updated' | 'title'>('updated')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      songsApi
        .list(bandId, { query: query || undefined, tag: tag || undefined, sort })
        .then((res) => setSongs(res.data.data.songs))
        .catch((err) => setError(apiErrorMessage(err, '無法載入歌曲列表')))
        .finally(() => setLoading(false))
    }, query ? 300 : 0) // 搜尋輸入 debounce
    return () => clearTimeout(timer)
  }, [bandId, query, tag, sort])

  const allTags = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags ?? []))].sort(),
    [songs]
  )

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await songsApi.create(bandId, { title: newTitle.trim() })
      navigate(`/songs/${res.data.data.song.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, '建立歌曲失敗'))
      setCreating(false)
    }
  }

  const onDelete = async (song: SongSummary) => {
    if (!window.confirm(`確定要刪除「${song.title}」嗎?`)) return
    setError('')
    try {
      await songsApi.remove(song.id)
      setSongs((prev) => prev.filter((s) => s.id !== song.id))
    } catch (err) {
      setError(apiErrorMessage(err, '刪除失敗'))
    }
  }

  return (
    <div>
      {canEdit && (
        <form onSubmit={onCreate} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="新歌曲名稱"
            maxLength={200}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 max-w-xs border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            建立歌曲
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          placeholder="搜尋歌名…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white w-48"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'updated' | 'title')}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
        >
          <option value="updated">最近更新</option>
          <option value="title">歌名</option>
        </select>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(tag === t ? '' : t)}
                className={`text-xs rounded-full px-2.5 py-1 border ${
                  tag === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">載入中…</p>
      ) : songs.length === 0 ? (
        <p className="text-gray-400">
          {query || tag ? '沒有符合的歌曲' : '還沒有歌曲' + (canEdit ? ',建立第一首吧!' : '')}
        </p>
      ) : (
        <ul className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {songs.map((song) => (
            <li
              key={song.id}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/songs/${song.id}`)}
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{song.title}</p>
                <p className="text-sm text-gray-500 truncate">
                  {[song.artist, song.originalKey, song.bpm && `${song.bpm} BPM`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {(song.tags ?? []).map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/songs/${song.id}/view`)
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  檢視
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDelete(song)
                    }}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    刪除
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
