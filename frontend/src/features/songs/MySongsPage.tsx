import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { bandsApi, apiErrorMessage, type BandSummary } from '../../api/bands'
import { songsApi, type SongSummary } from '../../api/songs'
import AppLayout from '../../components/AppLayout'
import FavoriteStar from './FavoriteStar'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

export default function MySongsPage() {
  const navigate = useNavigate()
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [bands, setBands] = useState<BandSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    Promise.all([songsApi.listMine(), bandsApi.list()])
      .then(([s, b]) => {
        setSongs(s.data.data.songs)
        setBands(b.data.data.bands)
      })
      .catch((err) => setError(apiErrorMessage(err, '無法載入我的歌曲')))
      .finally(() => setLoading(false))
  }, [])

  // 可分享的目標樂團(需 OWNER/EDITOR)
  const shareTargets = useMemo(
    () => bands.filter((b) => b.myRole === 'OWNER' || b.myRole === 'EDITOR'),
    [bands]
  )
  const bandName = (id: string | null) =>
    id ? (bands.find((b) => b.id === id)?.name ?? '某樂團') : null

  const allTags = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags ?? []))].sort(),
    [songs]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return songs.filter(
      (s) =>
        (!q || s.title.toLowerCase().includes(q)) &&
        (!onlyFav || s.favorite) &&
        (!tag || (s.tags ?? []).includes(tag))
    )
  }, [songs, query, onlyFav, tag])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => setPage(0), [query, tag, onlyFav, filtered.length])

  const toggleFav = async (song: SongSummary) => {
    const next = !song.favorite
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, favorite: next } : s)))
    try {
      await (next ? songsApi.favorite(song.id) : songsApi.unfavorite(song.id))
    } catch (err) {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, favorite: !next } : s)))
      setError(apiErrorMessage(err, '更新最愛失敗'))
    }
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await songsApi.createPersonal({ title: newTitle.trim() })
      navigate(`/songs/${res.data.data.song.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, '建立歌曲失敗'))
      setCreating(false)
    }
  }

  const replaceSong = (song: SongSummary) =>
    setSongs((prev) => prev.map((s) => (s.id === song.id ? song : s)))

  const onShare = async (songId: string, bandId: string) => {
    setError('')
    try {
      const res = await songsApi.share(songId, bandId)
      replaceSong(res.data.data.song)
    } catch (err) {
      setError(apiErrorMessage(err, '分享失敗'))
    }
  }

  const onUnshare = async (songId: string, bandId: string) => {
    setError('')
    try {
      const res = await songsApi.unshare(songId, bandId)
      replaceSong(res.data.data.song)
    } catch (err) {
      setError(apiErrorMessage(err, '取消分享失敗'))
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
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">我的歌曲</h2>
      </div>

      <form onSubmit={onCreate} className="flex gap-2 mb-6">
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

      <p className="text-sm text-gray-400 mb-4">
        這裡是你自己建立的歌曲。可以先在這裡編輯,再「分享到樂團」讓團員一起共編。
      </p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          placeholder="搜尋歌名…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white w-48"
        />
        {allTags.length > 0 && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">全部分類</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setOnlyFav((v) => !v)}
          className={`text-sm rounded px-3 py-1.5 border ${
            onlyFav
              ? 'bg-amber-400 text-white border-amber-400'
              : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
          }`}
        >
          ★ 只看最愛
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">載入中…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">
          {onlyFav ? '沒有加入最愛的歌曲' : query || tag ? '沒有符合的歌曲' : '還沒有歌曲,建立第一首吧!'}
        </p>
      ) : (
        <>
        <ul className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {pageItems.map((song) => (
            <li
              key={song.id}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FavoriteStar favorite={song.favorite} onToggle={() => void toggleFav(song)} />
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
                  {(song.tags ?? []).length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(song.tags ?? []).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTag(t)
                          }}
                          className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 hover:bg-blue-100 hover:text-blue-700"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end max-w-md">
                {song.bandIds.map((bid) => (
                  <span
                    key={bid}
                    className="text-xs bg-emerald-100 text-emerald-700 rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1"
                  >
                    {bandName(bid)}
                    <button
                      type="button"
                      title="取消分享"
                      onClick={() => void onUnshare(song.id, bid)}
                      className="w-4 h-4 rounded-full hover:bg-emerald-200 text-emerald-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(() => {
                  const avail = shareTargets.filter((b) => !song.bandIds.includes(b.id))
                  if (avail.length === 0) {
                    return song.bandIds.length === 0 ? (
                      <span className="text-xs text-gray-400">個人</span>
                    ) : null
                  }
                  return (
                    <select
                      value=""
                      onChange={(e) => e.target.value && void onShare(song.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-blue-600"
                    >
                      <option value="">＋ 分享到樂團…</option>
                      {avail.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )
                })()}

                <button
                  type="button"
                  onClick={() => navigate(`/songs/${song.id}/view`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  檢視
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(song)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </AppLayout>
  )
}
