import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../../api/bands'
import { songsApi, type SongDetail } from '../../api/songs'
import { transposeKey } from '../../lib/chord'
import AppLayout from '../../components/AppLayout'
import SheetPreview from './SheetPreview'
import VersionSidebar from './VersionSidebar'

const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

function normalizeShift(n: number): number {
  // 收斂到 -5..+6,選最短移調方向
  const m = ((n % 12) + 12) % 12
  return m > 6 ? m - 12 : m
}

export default function SongEditorPage() {
  const { id } = useParams<{ id: string }>()

  const [song, setSong] = useState<SongDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 編輯中的內容
  const [content, setContent] = useState('')
  const [revision, setRevision] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<{ content: string; revision: number } | null>(null)

  // 顯示層移調
  const [semitones, setSemitones] = useState(0)
  const [capo, setCapo] = useState(0)

  // 版本側欄
  const [showVersions, setShowVersions] = useState(false)

  // metadata 表單
  const [showMeta, setShowMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({
    title: '',
    artist: '',
    originalKey: '',
    bpm: '',
    timeSignature: '',
    tags: '',
  })

  const applySong = useCallback((s: SongDetail) => {
    setSong(s)
    setContent(s.content ?? '')
    setRevision(s.revision)
    setDirty(false)
    setConflict(null)
    setMetaForm({
      title: s.title,
      artist: s.artist ?? '',
      originalKey: s.originalKey ?? '',
      bpm: s.bpm != null ? String(s.bpm) : '',
      timeSignature: s.timeSignature ?? '',
      tags: (s.tags ?? []).join(', '),
    })
  }, [])

  useEffect(() => {
    if (!id) return
    songsApi
      .get(id)
      .then((res) => applySong(res.data.data.song))
      .catch((err) => setError(apiErrorMessage(err, '無法載入歌曲')))
      .finally(() => setLoading(false))
  }, [id, applySong])

  const canEdit = song?.myRole === 'OWNER' || song?.myRole === 'EDITOR'

  const onSaveContent = async () => {
    if (!id) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await songsApi.updateContent(id, content, revision)
      setRevision(res.data.data.revision)
      setDirty(false)
      setNotice('已儲存')
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { data?: { content: string; revision: number } } } })
        .response
      if (resp?.status === 409 && resp.data?.data) {
        setConflict(resp.data.data)
      } else {
        setError(apiErrorMessage(err, '儲存失敗'))
      }
    } finally {
      setSaving(false)
    }
  }

  const onAcceptLatest = () => {
    if (!conflict) return
    setContent(conflict.content)
    setRevision(conflict.revision)
    setDirty(false)
    setConflict(null)
    setNotice('已載入最新內容')
  }

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
      setShowMeta(false)
    } catch (err) {
      setError(apiErrorMessage(err, '更新歌曲資訊失敗'))
    }
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
        <p className="text-gray-400">載入中…</p>
      </AppLayout>
    )
  }

  if (!song) {
    return (
      <AppLayout>
        <p className="text-red-600">{error || '找不到歌曲'}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
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
        <Link to={`/bands/${song.bandId}`} className="text-sm text-blue-600 hover:underline">
          ← 回樂團
        </Link>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{song.title}</h2>
            <p className="text-sm text-gray-500">
              {[song.artist, song.originalKey && `原調 ${song.originalKey}`, song.bpm && `${song.bpm} BPM`, song.timeSignature]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowVersions(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              版本歷史
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowMeta((v) => !v)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showMeta ? '收合' : '編輯歌曲資訊'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* metadata 表單 */}
      {showMeta && canEdit && (
        <form onSubmit={onSaveMetadata} className="bg-white rounded-lg shadow p-4 mb-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            歌名 *
            <input
              required
              value={metaForm.title}
              onChange={(e) => setMetaForm({ ...metaForm, title: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            原唱/作者
            <input
              value={metaForm.artist}
              onChange={(e) => setMetaForm({ ...metaForm, artist: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            原調
            <select
              value={metaForm.originalKey}
              onChange={(e) => setMetaForm({ ...metaForm, originalKey: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 bg-white"
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
              value={metaForm.bpm}
              onChange={(e) => setMetaForm({ ...metaForm, bpm: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            拍號
            <input
              placeholder="4/4"
              value={metaForm.timeSignature}
              onChange={(e) => setMetaForm({ ...metaForm, timeSignature: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            標籤(逗號分隔)
            <input
              value={metaForm.tags}
              onChange={(e) => setMetaForm({ ...metaForm, tags: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5"
            />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm hover:bg-blue-700">
              儲存資訊
            </button>
          </div>
        </form>
      )}

      {/* 移調工具列 */}
      <div className="bg-white rounded-lg shadow px-4 py-2.5 mb-4 flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">移調</span>
          <button
            type="button"
            onClick={() => setSemitones((v) => normalizeShift(v - 1))}
            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 font-mono"
          >
            −
          </button>
          <span className="w-8 text-center font-mono">
            {semitones > 0 ? `+${semitones}` : semitones}
          </span>
          <button
            type="button"
            onClick={() => setSemitones((v) => normalizeShift(v + 1))}
            className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 font-mono"
          >
            +
          </button>
        </div>

        {song.originalKey && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">調</span>
            <select
              value={semitones}
              onChange={(e) => setSemitones(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 bg-white"
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
          <span className="text-gray-500">Capo</span>
          <select
            value={capo}
            onChange={(e) => setCapo(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 bg-white"
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
            className="text-gray-500 hover:text-gray-900"
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

      {/* 訊息列 */}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {notice && <p className="text-sm text-green-600 mb-3">{notice}</p>}
      {conflict && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3 text-sm flex items-center justify-between gap-4">
          <span className="text-orange-800">內容已被其他人更新(版本衝突)。</span>
          <button
            type="button"
            onClick={onAcceptLatest}
            className="text-orange-700 font-medium hover:underline shrink-0"
          >
            載入最新內容(捨棄我的修改)
          </button>
        </div>
      )}

      {/* 分割檢視 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700">ChordPro 原始碼</span>
            {canEdit && (
              <button
                type="button"
                onClick={() => void onSaveContent()}
                disabled={saving || !dirty}
                className="bg-blue-600 text-white rounded px-4 py-1 text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                {saving ? '儲存中…' : dirty ? '儲存' : '已儲存'}
              </button>
            )}
          </div>
          <textarea
            value={content}
            readOnly={!canEdit}
            onChange={(e) => {
              setContent(e.target.value)
              setDirty(true)
              setNotice('')
            }}
            spellCheck={false}
            placeholder={'[Verse]\n歌詞中放[C]和弦錨點,像[G]這樣\n\n| C | G | Am | F |'}
            className="flex-1 min-h-[28rem] font-mono text-sm border border-gray-300 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700 block mb-1.5">
            預覽
            {(semitones !== 0 || capo !== 0) && displayedKey && (
              <span className="text-gray-400 font-normal">
                {' '}
                — {displayedKey}
                {capo > 0 && ` / capo ${capo}`}
              </span>
            )}
          </span>
          <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[28rem] overflow-auto">
            <SheetPreview
              content={content}
              semitones={semitones}
              capo={capo}
              originalKey={song.originalKey}
            />
          </div>
        </div>
      </div>

      {showVersions && id && (
        <VersionSidebar
          songId={id}
          canEdit={canEdit}
          currentContent={content}
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
