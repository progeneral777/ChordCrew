import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { songsApi, type SongDetail } from '../../api/songs'
import { transposeKey } from '../../lib/chord'
import SheetPreview from '../editor/SheetPreview'

const MIN_FONT = 14
const MAX_FONT = 34
const MIN_SPEED = 10
const MAX_SPEED = 120

function normalizeShift(n: number): number {
  const m = ((n % 12) + 12) % 12
  return m > 6 ? m - 12 : m
}

function usePersisted(key: string, initial: number): [number, (v: number) => void] {
  const [value, setValue] = useState(() => {
    const stored = Number(localStorage.getItem(key))
    return Number.isFinite(stored) && stored > 0 ? stored : initial
  })
  return [
    value,
    (v: number) => {
      setValue(v)
      localStorage.setItem(key, String(v))
    },
  ]
}

export default function SongViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 回上一頁;若是直接開啟(無瀏覽紀錄)則退回首頁,避免離開 App。
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const [song, setSong] = useState<SongDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fontSize, setFontSize] = usePersisted('viewerFontSize', 20)
  const [speed, setSpeed] = usePersisted('viewerSpeed', 30)
  const [dark, setDark] = useState(() => localStorage.getItem('viewerDark') !== '0')
  const [semitones, setSemitones] = useState(0)
  const [capo, setCapo] = useState(0)
  const [scrolling, setScrolling] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    songsApi
      .get(id)
      .then((res) => setSong(res.data.data.song))
      .catch((err) => setError(apiErrorMessage(err, '無法載入歌曲')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    localStorage.setItem('viewerDark', dark ? '1' : '0')
  }, [dark])

  // 自動捲動:requestAnimationFrame,速度 px/秒,捲到底自動停止
  useEffect(() => {
    if (!scrolling) return
    let raf: number
    let last = performance.now()
    let acc = 0
    const step = (now: number) => {
      const el = scrollRef.current
      if (el) {
        acc += ((now - last) / 1000) * speed
        const px = Math.floor(acc)
        if (px >= 1) {
          el.scrollTop += px
          acc -= px
        }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setScrolling(false)
        }
      }
      last = now
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [scrolling, speed])

  const bg = dark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
  const barBg = dark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-slate-200'
  const btn = `min-w-9 h-9 px-2 rounded border text-sm font-medium ${
    dark
      ? 'border-slate-600 hover:bg-slate-700 active:bg-slate-600'
      : 'border-slate-300 hover:bg-slate-100 active:bg-slate-200'
  }`
  const subtle = dark ? 'text-slate-400' : 'text-slate-500'

  if (loading) {
    return (
      <div className={`fixed inset-0 ${bg} flex items-center justify-center`}>載入中…</div>
    )
  }

  if (!song) {
    return (
      <div className={`fixed inset-0 ${bg} flex flex-col items-center justify-center gap-3`}>
        <p className="text-red-500">{error || '找不到歌曲'}</p>
        <Link to="/bands" className="text-indigo-500 hover:underline text-sm">
          回樂團列表
        </Link>
      </div>
    )
  }

  const displayedKey = song.originalKey
    ? transposeKey(song.originalKey, semitones - capo)
    : null

  return (
    <div className={`fixed inset-0 ${bg} flex flex-col`}>
      {/* 控制列 */}
      <header className={`${barBg} border-b backdrop-blur px-3 py-2 flex items-center gap-x-3 gap-y-2 flex-wrap shrink-0`}>
        <button
          type="button"
          onClick={goBack}
          className="text-indigo-500 hover:underline text-sm shrink-0"
        >
          ← 上一頁
        </button>
        <span className="font-semibold truncate max-w-40 sm:max-w-none">{song.title}</span>

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => setFontSize(Math.max(MIN_FONT, fontSize - 2))} className={btn} aria-label="縮小字級">
            A−
          </button>
          <button type="button" onClick={() => setFontSize(Math.min(MAX_FONT, fontSize + 2))} className={btn} aria-label="放大字級">
            A+
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${subtle}`}>移調</span>
          <button type="button" onClick={() => setSemitones((v) => normalizeShift(v - 1))} className={btn}>
            −
          </button>
          <span className="w-7 text-center font-mono text-sm">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button type="button" onClick={() => setSemitones((v) => normalizeShift(v + 1))} className={btn}>
            +
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${subtle}`}>Capo</span>
          <select
            value={capo}
            onChange={(e) => setCapo(Number(e.target.value))}
            className={`h-9 rounded border px-1.5 text-sm ${
              dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'
            }`}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => setDark((v) => !v)} className={btn} aria-label="切換深色模式">
          {dark ? '☀️' : '🌙'}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScrolling((v) => !v)}
            className={`${btn} ${scrolling ? (dark ? 'bg-slate-700' : 'bg-slate-200') : ''}`}
            aria-label={scrolling ? '暫停捲動' : '自動捲動'}
          >
            {scrolling ? '⏸' : '▶'}
          </button>
          <input
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-20 sm:w-28 accent-indigo-500"
            aria-label="捲動速度"
          />
        </div>
      </header>

      {/* 譜面 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <div style={{ fontSize }} className="max-w-3xl mx-auto pb-[50vh]">
          <div className="mb-[1.2em]">
            <h1 className="text-[1.4em] font-bold leading-tight">{song.title}</h1>
            <p className={`text-[0.7em] ${subtle}`}>
              {[
                song.artist,
                displayedKey && `調 ${displayedKey}`,
                capo > 0 && `capo ${capo}`,
                song.bpm && `${song.bpm} BPM`,
                song.timeSignature,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <SheetPreview
            content={song.content ?? ''}
            semitones={semitones}
            capo={capo}
            originalKey={song.originalKey}
            dark={dark}
          />
        </div>
      </div>
    </div>
  )
}
