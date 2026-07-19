import { useMemo, useState } from 'react'
import { importChordSheet } from '../../lib/chord'
import SheetPreview from './SheetPreview'

interface ImportSheetModalProps {
  onClose: () => void
  onImport: (content: string) => void
}

const PLACEHOLDER = `把譜「選取後複製」貼在這裡。
維持「和弦一行、歌詞一行」的排版即可,例如:

     C       G/B     Am      F
夜色慢慢亮起 街燈還沒睡去`

/**
 * 貼上匯入:把「和弦一行、歌詞一行」的譜轉成本站的 [C]歌詞 格式。
 * 左邊貼原文、右邊即時預覽轉換結果,確認後才寫入。
 */
export default function ImportSheetModal({ onClose, onImport }: ImportSheetModalProps) {
  const [raw, setRaw] = useState('')
  const converted = useMemo(() => importChordSheet(raw), [raw])

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">貼上匯入和弦譜</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-4 overflow-auto">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-700 mb-1.5">貼上原文(和弦在上、歌詞在下)</span>
            <textarea
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              className="flex-1 min-h-[18rem] font-mono text-sm border border-slate-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-pre"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-700 mb-1.5">轉換後預覽</span>
            <div className="flex-1 min-h-[18rem] border border-slate-200 rounded-lg p-3 overflow-auto">
              {raw.trim() ? (
                <SheetPreview content={converted} semitones={0} capo={0} originalKey={null} />
              ) : (
                <p className="text-slate-400 text-sm">貼上內容後,這裡會顯示對齊好的和弦譜。</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            對齊靠空白欄位計算(中文字寬 2)。若和弦位置有點偏,匯入後可再手動微調。
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="border border-slate-300 text-slate-600 rounded px-4 py-1.5 text-sm hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!converted.trim()}
              onClick={() => onImport(converted)}
              className="btn-primary"
            >
              匯入(取代目前內容)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
