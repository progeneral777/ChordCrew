import { useEffect, useRef } from 'react'
import type { LockInfo } from '../../stores/collabStore'

interface SectionBlockProps {
  index: number
  content: string
  lockedBy: LockInfo | null
  isMine: boolean
  editable: boolean
  onFocus: () => void
  onChange: (value: string) => void
  onBlur: () => void
}

/** 單一段落的編輯區塊:他人編輯中顯示灰底+名字,自動依內容調整高度。 */
export default function SectionBlock({
  index,
  content,
  lockedBy,
  isMine,
  editable,
  onFocus,
  onChange,
  onBlur,
}: SectionBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const lockedByOther = lockedBy !== null && !isMine

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 2}px`
    }
  }, [content])

  return (
    <div className="relative">
      {lockedByOther && (
        <span className="absolute -top-2 right-2 z-10 text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 shadow-sm">
          {lockedBy.displayName} 編輯中
        </span>
      )}
      {isMine && (
        <span className="absolute -top-2 right-2 z-10 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 shadow-sm">
          編輯中(我)
        </span>
      )}
      <textarea
        ref={ref}
        data-section={index}
        value={content}
        readOnly={!editable || lockedByOther}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        spellCheck={false}
        rows={1}
        className={`w-full font-mono text-sm border rounded-lg p-3 resize-none overflow-hidden focus:outline-none ${
          lockedByOther
            ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
            : isMine
              ? 'bg-white border-blue-400 ring-2 ring-blue-100'
              : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
        }`}
      />
    </div>
  )
}
