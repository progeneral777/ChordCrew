import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/bands'
import type { SongDetail } from '../../api/songs'
import { versionsApi, type VersionDetail, type VersionSummary } from '../../api/versions'

interface VersionSidebarProps {
  songId: string
  canEdit: boolean
  currentContent: string
  onClose: () => void
  onRestored: (song: SongDetail) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VersionSidebar({
  songId,
  canEdit,
  currentContent,
  onClose,
  onRestored,
}: VersionSidebarProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<VersionDetail | null>(null)

  const reload = useCallback(() => {
    versionsApi
      .list(songId)
      .then((res) => setVersions(res.data.data.versions))
      .catch((err) => setError(apiErrorMessage(err, '無法載入版本列表')))
      .finally(() => setLoading(false))
  }, [songId])

  useEffect(() => {
    reload()
  }, [reload])

  const onSnapshot = async () => {
    setSaving(true)
    setError('')
    try {
      await versionsApi.create(songId, note.trim() || undefined)
      setNote('')
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, '儲存版本失敗'))
    } finally {
      setSaving(false)
    }
  }

  const onPreview = async (versionId: string) => {
    setError('')
    try {
      const res = await versionsApi.get(songId, versionId)
      setPreview(res.data.data.version)
    } catch (err) {
      setError(apiErrorMessage(err, '無法載入版本內容'))
    }
  }

  const onRestore = async (version: VersionSummary | VersionDetail) => {
    if (!window.confirm('確定要還原到此版本嗎?目前內容會先自動快照。')) return
    setError('')
    try {
      const res = await versionsApi.restore(songId, version.id)
      setPreview(null)
      onRestored(res.data.data.song)
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, '還原失敗'))
    }
  }

  return (
    <>
      <aside className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-30 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">版本歷史</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {canEdit && (
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="版本備註(選填)"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => void onSnapshot()}
              disabled={saving}
              className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
            >
              儲存版本
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600 px-4 py-2">{error}</p>}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="text-gray-400 text-sm p-4">載入中…</p>
          ) : versions.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">還沒有版本快照</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {versions.map((v) => (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {v.note || '(無備註)'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(v.createdAt)} · {v.createdBy.displayName}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => void onPreview(v.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      檢視對照
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void onRestore(v)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        還原
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 全文對照 modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">
                  版本對照 — {preview.note || '(無備註)'}
                </h4>
                <p className="text-xs text-gray-500">
                  {formatTime(preview.createdAt)} · {preview.createdBy.displayName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void onRestore(preview)}
                    className="bg-orange-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-orange-700"
                  >
                    還原到此版本
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden">
              <div className="border-r border-gray-100 flex flex-col overflow-hidden">
                <p className="text-xs font-medium text-gray-500 px-4 pt-3 pb-1">目前內容</p>
                <pre className="flex-1 overflow-auto text-sm font-mono px-4 pb-4 whitespace-pre-wrap">
                  {currentContent}
                </pre>
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-medium text-gray-500 px-4 pt-3 pb-1">此版本內容</p>
                <pre className="flex-1 overflow-auto text-sm font-mono px-4 pb-4 whitespace-pre-wrap">
                  {preview.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
