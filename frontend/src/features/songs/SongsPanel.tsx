import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage, type Role } from '../../api/bands'
import { songsApi, type SongSummary } from '../../api/songs'
import FavoriteStar from './FavoriteStar'
import Pagination from '../../components/Pagination'

interface SongsPanelProps {
  bandId: string
  myRole: Role
}

const PAGE_SIZE = 10

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
  const [onlyFav, setOnlyFav] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      songsApi
        .list(bandId, { query: query || undefined, sort })
        .then((res) => setSongs(res.data.data.songs))
        .catch((err) => setError(apiErrorMessage(err, '無法載入歌曲列表')))
        .finally(() => setLoading(false))
    }, query ? 300 : 0) // 搜尋輸入 debounce
    return () => clearTimeout(timer)
  }, [bandId, query, sort, reloadTick])

  // 分類選項取自搜尋結果全集(不受目前分類篩選影響,確保能切換到其他分類)
  const allTags = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags ?? []))].sort(),
    [songs]
  )

  const filtered = useMemo(
    () =>
      songs.filter(
        (s) => (!onlyFav || s.favorite) && (!tag || (s.tags ?? []).includes(tag))
      ),
    [songs, onlyFav, tag]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  // 篩選條件或清單筆數變動時回到第一頁
  useEffect(() => setPage(0), [query, tag, sort, onlyFav, filtered.length])

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
      setPullList(res.data.data.songs.filter((s) => !s.bandIds.includes(bandId)))
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
            className="input flex-1 max-w-xs"
          />
          <button type="submit" disabled={creating || !newTitle.trim()} className="btn-primary">
            建立歌曲
          </button>
          <button
            type="button"
            onClick={() => (showPull ? setShowPull(false) : void openPull())}
            className="btn-secondary"
          >
            {showPull ? '收合' : '拉入我的歌曲'}
          </button>
        </form>
      )}

      {canEdit && showPull && (
        <div className="card p-4 mb-4 bg-slate-50/60">
          <p className="text-sm font-medium text-slate-700 mb-2">
            從「我的歌曲」選一首拉進這個樂團共享:
          </p>
          {pullList.length === 0 ? (
            <p className="text-sm text-slate-400">
              沒有可拉入的歌曲。你的歌曲可能都已在這個樂團,或先到「我的歌曲」建立。
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pullList.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-800 truncate">{s.title}</span>
                  <button
                    type="button"
                    onClick={() => void onPull(s.id)}
                    className="text-sm text-indigo-600 hover:underline shrink-0"
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
          className="input w-48"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'updated' | 'title')}
          className="input w-auto"
        >
          <option value="updated">最近更新</option>
          <option value="title">歌名</option>
        </select>
        <button
          type="button"
          onClick={() => setOnlyFav((v) => !v)}
          className={`text-sm rounded-xl px-3 py-2 border transition ${
            onlyFav
              ? 'bg-amber-400 text-white border-amber-400'
              : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400'
          }`}
        >
          ★ 只看最愛
        </button>
        {allTags.length > 0 && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="input w-auto"
          >
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
        <p className="text-slate-400">
          {onlyFav
            ? '沒有加入最愛的歌曲'
            : query || tag
              ? '沒有符合的歌曲'
              : '還沒有歌曲' + (canEdit ? ',建立第一首吧!' : '')}
        </p>
      ) : (
        <>
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {pageItems.map((song) => (
            <li
              key={song.id}
              className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
              onClick={() => navigate(`/songs/${song.id}`)}
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
                  <span key={t} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
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
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  )
}
