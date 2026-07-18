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
  const [reloadTick, setReloadTick] = useState(0)
  const [showPull, setShowPull] = useState(false)
  const [pullList, setPullList] = useState<SongSummary[]>([])

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
  }, [bandId, query, tag, sort, reloadTick])

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

  const openPull = async () => {
    setShowPull(true)
    setError('')
    try {
      const res = await songsApi.listMine()
      setPullList(res.data.data.songs.filter((s) => s.bandId === null))
    } catch (err) {
      setError(apiErrorMessage(err, '無法載入我的歌曲'))
    }
  }

  const onPull = async (songId: string) => {
    setError('')
    try {
      await songsApi.share(songId, bandId)
      setShowPull(false)
      setReloadTick((t) => t + 1)
    } catch (err) {
      setError(apiErrorMessage(err, '拉入失敗'))
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
          <button
            type="button"
            onClick={() => (showPull ? setShowPull(false) : void openPull())}
            className="border border-gray-300 text-gray-700 rounded px-4 py-2 font-medium hover:bg-gray-50"
          >
            {showPull ? '收合' : '拉入我的歌曲'}
          </button>
        </form>
      )}

      {canEdit && showPull && (
        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">
            從「我的歌曲」選一首拉進這個樂團共享:
          </p>
          {pullList.length === 0 ? (
            <p className="text-sm text-gray-400">
              沒有可拉入的個人歌曲。先到上方「我的歌曲」建立,或該歌曲已分享到其他樂團。
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pullList.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-800 truncate">{s.title}</span>
                  <button
                    type="button"
                    onClick={() => void onPull(s.id)}
                    className="text-sm text-blue-600 hover:underline shrink-0"
                  >
                    拉入
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
