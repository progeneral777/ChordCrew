import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { songsApi, type SongSummary } from '../../api/songs'
import AppLayout from '../../components/AppLayout'
import FavoriteStar from './FavoriteStar'
import Pagination from '../../components/Pagination'

const PAGE_SIZE = 10

export default function PublicSongsPage() {
  const navigate = useNavigate()
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      songsApi
        .listPublic({ query: query || undefined })
        .then((res) => setSongs(res.data.data.songs))
        .catch((err) => setError(apiErrorMessage(err, '無法載入公開歌曲')))
        .finally(() => setLoading(false))
    }, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  const allTags = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags ?? []))].sort(),
    [songs]
  )

  const filtered = useMemo(
    () => songs.filter((s) => !tag || (s.tags ?? []).includes(tag)),
    [songs, tag]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => setPage(0), [query, tag, filtered.length])

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

  return (
    <AppLayout>
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-900">探索</h2>
        <p className="text-sm text-slate-400 mt-1">瀏覽其他人分享的公開歌曲,點「檢視」即可觀看譜面。</p>
      </div>

      <div className="flex items-center gap-3 my-4 flex-wrap">
        <input
          type="search"
          placeholder="搜尋歌名…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input w-48"
        />
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="input w-auto">
            <option value="">全部分類</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-slate-400">載入中…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          {query || tag ? '沒有符合的公開歌曲' : '目前還沒有公開歌曲'}
        </div>
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {pageItems.map((song) => (
              <li
                key={song.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                onClick={() => navigate(`/songs/${song.id}/view`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FavoriteStar favorite={song.favorite} onToggle={() => void toggleFav(song)} />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{song.title}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {[song.artist, song.originalKey, song.bpm && `${song.bpm} BPM`]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {(song.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/songs/${song.id}/view`)
                    }}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    檢視
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
