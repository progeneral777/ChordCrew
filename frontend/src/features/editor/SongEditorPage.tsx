import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { songsApi, type SongDetail } from '../../api/songs'
import { applySectionUpdate, splitSections, transposeKey } from '../../lib/chord'
import { useAuthStore } from '../../stores/authStore'
import { useCollabStore } from '../../stores/collabStore'
import AppLayout from '../../components/AppLayout'
import SheetPreview from './SheetPreview'
import SectionBlock from './SectionBlock'
import VersionSidebar from './VersionSidebar'
import ImportSheetModal from './ImportSheetModal'

const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const IDLE_MS = 3000 // 3 秒 idle 即廣播更新

// 範例歌曲:示範 ChordPro 變體寫法(段落標題、純和弦小節行、歌詞內和弦錨點)。
// 依 CHORD_SPEC.md,歌詞正文皆為原創以避免版權問題。
const EXAMPLE_SONG = `[Intro]
| C | G/B | Am | F |

[Verse 1]
夜色[C]慢慢亮起 街燈[G/B]還沒睡去
我背著[Am]吉他 走過熟悉的[F]巷子
把煩惱[C]留在原地 把心事[G/B]輕輕放低
唱一首[Am]屬於我們的[F]歌[G]

[Chorus]
就算全世[C]界都在下[G]雨
也擋不[Am]住我想你的[F]心
我會為[C]你寫下這[G]首歌
在每個[Am]需要勇氣的[F]夜[G]裡[C]

[Bridge]
| Am | F | C | G |
| Am | F | Dsus4 | G7 |

[Verse 2]
時間[C]慢慢過去 我們[G/B]都會長大
那些[Am]旋律 依然刻在心[F]底`

function normalizeShift(n: number): number {
  const m = ((n % 12) + 12) % 12
  return m > 6 ? m - 12 : m
}

export default function SongEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const myUserId = useAuthStore((s) => s.user?.id)

  const [song, setSong] = useState<SongDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 段落式內容(即時共編的單位)
  const [sections, setSections] = useState<string[]>([''])
  const sectionsRef = useRef<string[]>([''])
  const revisionRef = useRef(0)
  const dirtySection = useRef<number | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 顯示層移調
  const [semitones, setSemitones] = useState(0)
  const [capo, setCapo] = useState(0)

  // 是否有尚未同步的編輯(供儲存按鈕/狀態指示用)
  const [hasPendingEdit, setHasPendingEdit] = useState(false)

  const [showVersions, setShowVersions] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false) // 歌曲資訊預設唯讀,按「編輯」才可改
  const [metaForm, setMetaForm] = useState({
    title: '',
    artist: '',
    originalKey: '',
    bpm: '',
    timeSignature: '',
    tags: '',
  })

  const wsStatus = useCollabStore((s) => s.status)
  const users = useCollabStore((s) => s.users)
  const locks = useCollabStore((s) => s.locks)
  const myLocks = useCollabStore((s) => s.myLocks)
  const collabConnect = useCollabStore((s) => s.connect)
  const collabDisconnect = useCollabStore((s) => s.disconnect)
  const collabLock = useCollabStore((s) => s.lock)
  const collabUnlock = useCollabStore((s) => s.unlock)
  const collabSend = useCollabStore((s) => s.sendUpdate)

  const setAllSections = useCallback((content: string, revision: number) => {
    const split = splitSections(content)
    setSections(split)
    sectionsRef.current = split
    revisionRef.current = revision
  }, [])

  const applySong = useCallback(
    (s: SongDetail) => {
      setSong(s)
      setAllSections(s.content ?? '', s.revision)
      setMetaForm({
        title: s.title,
        artist: s.artist ?? '',
        originalKey: s.originalKey ?? '',
        bpm: s.bpm != null ? String(s.bpm) : '',
        timeSignature: s.timeSignature ?? '',
        tags: (s.tags ?? []).join(', '),
      })
    },
    [setAllSections]
  )

  // 載入歌曲
  useEffect(() => {
    if (!id) return
    songsApi
      .get(id)
      .then((res) => applySong(res.data.data.song))
      .catch((err) => setError(apiErrorMessage(err, '無法載入歌曲')))
      .finally(() => setLoading(false))
  }, [id, applySong])

  // 建立 WebSocket 連線
  useEffect(() => {
    if (!id || !song || !myUserId) return
    collabConnect(id, myUserId, {
      onSectionUpdated: (sectionIndex, content, revision) => {
        revisionRef.current = revision
        if (sectionIndex < 0) return // 自己持鎖段落的回音,只更新 revision
        const updated = applySectionUpdate(sectionsRef.current.join('\n'), sectionIndex, content)
        if (updated !== null) {
          const split = splitSections(updated)
          setSections(split)
          sectionsRef.current = split
        }
      },
      onSync: (content, revision) => {
        // 保留使用者正在編輯、尚未成功送出的段落,其餘同步為伺服器最新版本,
        // 避免一個 SYNC 就把正在打字的內容清空。
        const dirty = dirtySection.current
        const incoming = splitSections(content)
        if (dirty !== null && dirty >= 0 && dirty < incoming.length) {
          incoming[dirty] = sectionsRef.current[dirty] ?? incoming[dirty]
          setSections(incoming)
          sectionsRef.current = incoming
          revisionRef.current = revision
        } else {
          setAllSections(content, revision)
          setNotice('內容已同步為最新版本')
        }
      },
      onReconnected: () => {
        // 重連後重新拉最新全文
        songsApi
          .get(id)
          .then((res) => {
            setAllSections(res.data.data.song.content ?? '', res.data.data.song.revision)
          })
          .catch(() => {})
      },
    })
    return () => collabDisconnect()
    // song 首次載入後建立一次連線即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, song?.id, myUserId])

  const canEdit = song?.myRole === 'OWNER' || song?.myRole === 'EDITOR'
  const editable = canEdit && wsStatus === 'connected'
  const joined = useMemo(() => sections.join('\n'), [sections])

  // --- 段落編輯流程:focus 取鎖 → 輸入(3 秒 idle 廣播)→ blur 送出+解鎖 ---

  const flushUpdate = useCallback(() => {
    const idx = dirtySection.current
    if (idx === null) return
    dirtySection.current = null
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    collabSend(idx, sectionsRef.current[idx] ?? '', revisionRef.current)
    setHasPendingEdit(false)
  }, [collabSend])

  // Cmd/Ctrl+S 立即儲存(同步當前段落)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        flushUpdate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flushUpdate])

  const onSectionFocus = (idx: number) => {
    if (!editable) return
    // 換段落時先送出上一段
    if (dirtySection.current !== null && dirtySection.current !== idx) flushUpdate()
    collabLock(idx)
  }

  const onSectionChange = (idx: number, value: string) => {
    const next = [...sectionsRef.current]
    next[idx] = value
    setSections(next)
    sectionsRef.current = next
    dirtySection.current = idx
    setHasPendingEdit(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(flushUpdate, IDLE_MS)
  }

  const onSectionBlur = (idx: number) => {
    flushUpdate()
    collabUnlock(idx)
  }

  // --- metadata / 移調(REST,與 Phase 4 相同)---

  const onSaveMetadata = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError('')
    try {
      const res = await songsApi.updateMetadata(id, {
        title: metaForm.title.trim(),
        artist: metaForm.artist,
        originalKey: metaForm.originalKey,
        bpm: metaForm.bpm ? Number(metaForm.bpm) : undefined,
        timeSignature: metaForm.timeSignature,
        tags: metaForm.tags
          .split(/[,、]/)
          .map((t) => t.trim())
          .filter(Boolean),
      })
      const s = res.data.data.song
      setSong((prev) => (prev ? { ...prev, ...s, content: prev.content } : s))
      setNotice('資訊已更新')
      setEditingMeta(false)
    } catch (err) {
      setError(apiErrorMessage(err, '更新歌曲資訊失敗'))
    }
  }

  // 取消編輯:欄位還原成目前歌曲的值,回到唯讀狀態。
  const onCancelMeta = () => {
    if (song) {
      setMetaForm({
        title: song.title,
        artist: song.artist ?? '',
        originalKey: song.originalKey ?? '',
        bpm: song.bpm != null ? String(song.bpm) : '',
        timeSignature: song.timeSignature ?? '',
        tags: (song.tags ?? []).join(', '),
      })
    }
    setEditingMeta(false)
  }

  // 用 REST 全文取代(範例插入、貼上匯入共用):會落庫並廣播 SYNC 給協作者。
  const replaceContent = useCallback(
    async (content: string, successMsg: string) => {
      if (!id) return
      setError('')
      try {
        const res = await songsApi.updateContent(id, content, revisionRef.current)
        setAllSections(content, res.data.data.revision)
        dirtySection.current = null
        setHasPendingEdit(false)
        setNotice(successMsg)
      } catch (err) {
        setError(apiErrorMessage(err, '寫入失敗,請重新整理後再試'))
      }
    },
    [id, setAllSections]
  )

  const onInsertExample = () => {
    if (joined.trim() && !window.confirm('這會取代目前的譜面內容,確定要插入範例歌曲嗎?')) return
    void replaceContent(EXAMPLE_SONG, '已插入範例歌曲,可直接編輯或參考寫法')
  }

  const onImport = (content: string) => {
    if (joined.trim() && !window.confirm('這會取代目前的譜面內容,確定匯入嗎?')) return
    void replaceContent(content, '已匯入並轉換為和弦譜格式')
    setShowImport(false)
  }

  const onPermanentTranspose = async () => {
    if (!id || semitones === 0) return
    if (!window.confirm(`確定要永久移調 ${semitones > 0 ? '+' : ''}${semitones} 半音嗎?這會改寫譜面內容。`))
      return
    setError('')
    try {
      const res = await songsApi.transpose(id, semitones)
      applySong(res.data.data.song)
      setSemitones(0)
      setNotice('已永久移調')
    } catch (err) {
      setError(apiErrorMessage(err, '移調失敗'))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-slate-400">載入中…</p>
      </AppLayout>
    )
  }

  if (!song) {
    return (
      <AppLayout>
        <p className="text-red-600">{error || '找不到歌曲'}</p>
        <Link to="/bands" className="text-indigo-600 hover:underline text-sm">
          回樂團列表
        </Link>
      </AppLayout>
    )
  }

  const displayedKey = song.originalKey ? transposeKey(song.originalKey, semitones) : null

  return (
    <AppLayout>
      {/* 標題列 */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← 返回
        </button>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{song.title}</h2>
            <p className="text-sm text-slate-500">
              {[song.artist, song.originalKey && `原調 ${song.originalKey}`, song.bpm && `${song.bpm} BPM`, song.timeSignature]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 在線頭像列 */}
            <div className="flex -space-x-1.5">
              {users.map((u) => (
                <span
                  key={u.userId}
                  title={u.displayName}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white ${
                    u.userId === myUserId ? 'bg-indigo-600' : 'bg-emerald-500'
                  }`}
                >
                  {u.displayName.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            <Link to={`/songs/${song.id}/view`} className="text-sm text-indigo-600 hover:underline">
              檢視模式
            </Link>
            <button
              type="button"
              onClick={() => setShowVersions(true)}
              className="text-sm text-indigo-600 hover:underline"
            >
              版本歷史
            </button>
          </div>
        </div>
      </div>

      {/* 連線狀態 */}
      {wsStatus === 'disconnected' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2.5 mb-3 text-sm text-yellow-800">
          連線中斷,重新連線中… 編輯已暫停
        </div>
      )}

      {/* 歌曲資訊:預設唯讀顯示,按「編輯」才能修改 */}
      {canEdit && (
        <form onSubmit={onSaveMetadata} className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">歌曲資訊</span>
            {!editingMeta && (
              <button
                type="button"
                onClick={() => setEditingMeta(true)}
                className="text-sm text-indigo-600 hover:underline"
              >
                編輯
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              歌名 *
              <input
                required
                disabled={!editingMeta}
                value={metaForm.title}
                onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm">
              原唱/作者
              <input
                disabled={!editingMeta}
                value={metaForm.artist}
                onChange={(e) => setMetaForm({ ...metaForm, artist: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm">
              原調
              <select
                disabled={!editingMeta}
                value={metaForm.originalKey}
                onChange={(e) => setMetaForm({ ...metaForm, originalKey: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">未設定</option>
                {ALL_KEYS.flatMap((k) => [k, k + 'm']).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              BPM
              <input
                type="number"
                min={1}
                max={400}
                disabled={!editingMeta}
                value={metaForm.bpm}
                onChange={(e) => setMetaForm({ ...metaForm, bpm: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm">
              拍號
              <input
                placeholder="4/4"
                disabled={!editingMeta}
                value={metaForm.timeSignature}
                onChange={(e) => setMetaForm({ ...metaForm, timeSignature: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm">
              分類/標籤(逗號分隔)
              <input
                disabled={!editingMeta}
                value={metaForm.tags}
                onChange={(e) => setMetaForm({ ...metaForm, tags: e.target.value })}
                className="input mt-1 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
          </div>

          {editingMeta && (
            <div className="mt-3 flex gap-2">
              <button type="submit" className="btn-primary">
                儲存資訊
              </button>
              <button type="button" onClick={onCancelMeta} className="btn-secondary">
                取消
              </button>
            </div>
          )}
        </form>
      )}

      {/* 移調工具列 */}
      <div className="card px-4 py-2.5 mb-4 flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">移調</span>
          <button
            type="button"
            onClick={() => setSemitones((v) => normalizeShift(v - 1))}
            className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 font-mono"
          >
            −
          </button>
          <span className="w-8 text-center font-mono">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button
            type="button"
            onClick={() => setSemitones((v) => normalizeShift(v + 1))}
            className="w-7 h-7 rounded border border-slate-300 hover:bg-slate-100 font-mono"
          >
            +
          </button>
        </div>

        {song.originalKey && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">調</span>
            <select
              value={semitones}
              onChange={(e) => setSemitones(Number(e.target.value))}
              className="border border-slate-300 rounded px-2 py-1 bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => normalizeShift(i))
                .sort((a, b) => a - b)
                .map((shift) => (
                  <option key={shift} value={shift}>
                    {transposeKey(song.originalKey!, shift)}
                    {shift === 0 ? '(原調)' : ''}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Capo</span>
          <select
            value={capo}
            onChange={(e) => setCapo(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 bg-white"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {(semitones !== 0 || capo !== 0) && (
          <button
            type="button"
            onClick={() => {
              setSemitones(0)
              setCapo(0)
            }}
            className="text-slate-500 hover:text-slate-900"
          >
            重設
          </button>
        )}

        {canEdit && semitones !== 0 && (
          <button
            type="button"
            onClick={() => void onPermanentTranspose()}
            className="ml-auto text-orange-600 hover:text-orange-800 font-medium"
          >
            永久移調 {semitones > 0 ? `+${semitones}` : semitones}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {notice && <p className="text-sm text-green-600 mb-3">{notice}</p>}

      {/* 分割檢視:左段落編輯、右預覽 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between min-h-8 gap-3">
            <span className="text-sm font-medium text-slate-700">
              ChordPro 原始碼(依段落編輯,他人編輯中的段落唯讀)
            </span>
            <div className="flex items-center gap-3 shrink-0">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  貼上匯入
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={onInsertExample}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  插入範例
                </button>
              )}
              {canEdit &&
                (hasPendingEdit ? (
                  <button type="button" onClick={flushUpdate} className="btn-primary">
                    儲存(⌘S)
                  </button>
                ) : (
                  <span className="text-sm text-emerald-600">✓ 已自動儲存</span>
                ))}
            </div>
          </div>

          {canEdit && !joined.trim() && (
            <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 text-sm text-indigo-700 flex flex-col gap-2">
              <span>
                ✨ 還不知道怎麼寫?可以參考和弦與歌詞的寫法(段落標題、
                <code className="mx-0.5 px-1 bg-indigo-100 rounded">| C | G |</code> 純和弦行、
                歌詞內的 <code className="mx-0.5 px-1 bg-indigo-100 rounded">[C]和弦</code> 錨點)
              </span>
              <div className="flex gap-3">
                <button type="button" onClick={onInsertExample} className="btn-primary">
                  插入範例歌曲
                </button>
                <button type="button" onClick={() => setShowImport(true)} className="btn-secondary">
                  貼上匯入
                </button>
              </div>
            </div>
          )}
          {sections.map((sectionContent, idx) => (
            <SectionBlock
              key={idx}
              index={idx}
              content={sectionContent}
              lockedBy={locks[idx] ?? null}
              isMine={myLocks.has(idx)}
              editable={editable}
              onFocus={() => onSectionFocus(idx)}
              onChange={(value) => onSectionChange(idx, value)}
              onBlur={() => onSectionBlur(idx)}
            />
          ))}
        </div>
        <div>
          <span className="text-sm font-medium text-slate-700 block mb-1.5">
            預覽
            {(semitones !== 0 || capo !== 0) && displayedKey && (
              <span className="text-slate-400 font-normal">
                {' '}
                — {displayedKey}
                {capo > 0 && ` / capo ${capo}`}
              </span>
            )}
          </span>
          <div className="card p-4 min-h-[28rem] overflow-auto">
            <SheetPreview
              content={joined}
              semitones={semitones}
              capo={capo}
              originalKey={song.originalKey}
            />
          </div>
        </div>
      </div>

      {showImport && (
        <ImportSheetModal onClose={() => setShowImport(false)} onImport={onImport} />
      )}

      {showVersions && id && (
        <VersionSidebar
          songId={id}
          canEdit={canEdit}
          currentContent={joined}
          onClose={() => setShowVersions(false)}
          onRestored={(s) => {
            applySong(s)
            setNotice('已還原到所選版本')
          }}
        />
      )}
    </AppLayout>
  )
}
