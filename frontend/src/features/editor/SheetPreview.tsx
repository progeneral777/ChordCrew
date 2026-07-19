import { useMemo } from 'react'
import {
  formatChordDisplay,
  parseChordPro,
  transposeChord,
  transposeKey,
  type SheetLine,
} from '../../lib/chord'

interface SheetPreviewProps {
  content: string
  /** 顯示層移調(相對原調的半音數) */
  semitones?: number
  /** capo 格數:顯示和弦 = 移調後和弦再 -capo */
  capo?: number
  originalKey?: string | null
  /** 深色模式(檢視模式用);尺寸以 em 計,由外層 font-size 控制字級 */
  dark?: boolean
  className?: string
}

export default function SheetPreview({
  content,
  semitones = 0,
  capo = 0,
  originalKey = null,
  dark = false,
  className = '',
}: SheetPreviewProps) {
  const sheet = useMemo(() => parseChordPro(content), [content])

  const shift = semitones - capo
  const displayKey = originalKey ? transposeKey(originalKey, shift) : null

  const chordColor = dark ? 'text-sky-400' : 'text-indigo-600'
  const invalidColor = dark ? 'text-red-400 bg-red-950' : 'text-red-500 bg-red-50'
  const badgeColor = dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'

  const renderChord = (chord: string, valid: boolean) => {
    if (!valid) {
      return (
        <span className={`${invalidColor} rounded px-0.5`} title="無法解析的和弦">
          {chord}
        </span>
      )
    }
    const transposed = shift === 0 ? chord : (transposeChord(chord, shift, displayKey) ?? chord)
    return <span className={`${chordColor} font-semibold`}>{formatChordDisplay(transposed)}</span>
  }

  const renderLine = (line: SheetLine, idx: number) => {
    if (line.type === 'empty') return <div key={idx} className="h-[0.9em]" />

    if (line.type === 'instrumental') {
      return (
        <div key={idx} className={`font-mono ${chordColor} font-semibold py-0.5`}>
          {'| '}
          {line.measures.map((bar, i) => (
            <span key={i}>
              {bar.map((chord, j) => (
                <span key={j}>
                  {j > 0 && ' '}
                  {renderChord(chord, true)}
                </span>
              ))}
              {' | '}
            </span>
          ))}
        </div>
      )
    }

    return (
      <div key={idx} className="flex flex-wrap items-end leading-tight py-0.5">
        {line.segments.map((seg, i) => (
          <span key={i} className="inline-flex flex-col whitespace-pre-wrap">
            <span className="text-[0.85em] min-h-[1.3em] pr-1">
              {seg.chord !== null && renderChord(seg.chord, seg.chordValid)}
            </span>
            <span>{seg.text}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {sheet.sections.map((section, si) => (
        <section key={si} className="mb-[1.2em]">
          {section.name && (
            <h4
              className={`inline-block ${badgeColor} text-[0.8em] font-semibold rounded px-2 py-0.5 mb-[0.5em]`}
            >
              {section.name}
            </h4>
          )}
          {section.lines.map(renderLine)}
        </section>
      ))}
      {sheet.sections.length === 0 && (
        <p className={`${dark ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
          預覽會顯示在這裡 — 開始輸入譜面內容吧
        </p>
      )}
    </div>
  )
}
