// ChordPro 變體解析(CHORD_SPEC.md 第 1 節)— 切段落、切 token,與整份內容移調。

import { parseChord, transposeChord, transposeKey } from './chord'

export interface LyricSegment {
  chord: string | null
  text: string
  /** chord 不為 null 時:能否解析為合法和弦(false 時編輯器標紅) */
  chordValid: boolean
}

export type SheetLine =
  | { type: 'lyric'; segments: LyricSegment[] }
  | { type: 'instrumental'; measures: string[][] }
  | { type: 'empty' }

export interface Section {
  /** null = 第一個段落標題出現前的內容 */
  name: string | null
  lines: SheetLine[]
}

export interface ParsedSheet {
  metadata: Record<string, string>
  sections: Section[]
}

const METADATA_RE = /^\{\s*([\w-]+)\s*:\s*(.*?)\s*\}$/
const SECTION_RE = /^\[([^[\]]+)\]$/

/**
 * 段落標題 = 獨佔一行的 [Name],且內容無法解析為和弦
 * (讓單一和弦行如 "[C]" 仍視為和弦行;spec 未明確定義,取合理解釋)。
 */
function asSectionName(trimmedLine: string): string | null {
  const m = SECTION_RE.exec(trimmedLine)
  if (!m) return null
  return parseChord(m[1]) ? null : m[1]
}

function parseLyricLine(line: string): SheetLine {
  const parts = line.split(/(\[[^[\]]*\])/)
  const segments: LyricSegment[] = []
  let pendingChord: string | null = null

  for (const part of parts) {
    if (part.startsWith('[') && part.endsWith(']')) {
      // 連續兩個和弦(中間無歌詞)→ 前一個自成空字段
      if (pendingChord !== null) {
        segments.push({ chord: pendingChord, text: '', chordValid: !!parseChord(pendingChord) })
      }
      pendingChord = part.slice(1, -1)
    } else if (part !== '') {
      segments.push({
        chord: pendingChord,
        text: part,
        chordValid: pendingChord === null || !!parseChord(pendingChord),
      })
      pendingChord = null
    }
  }
  if (pendingChord !== null) {
    segments.push({ chord: pendingChord, text: '', chordValid: !!parseChord(pendingChord) })
  }
  return { type: 'lyric', segments }
}

function parseInstrumentalLine(line: string): SheetLine {
  const measures = line
    .split('|')
    .map((bar) => bar.trim())
    .filter((bar) => bar !== '')
    .map((bar) => bar.split(/\s+/))
  return { type: 'instrumental', measures }
}

export function parseChordPro(content: string): ParsedSheet {
  const metadata: Record<string, string> = {}
  const sections: Section[] = []
  let current: Section = { name: null, lines: [] }

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    const metaMatch = METADATA_RE.exec(trimmed)
    if (metaMatch) {
      metadata[metaMatch[1].toLowerCase()] = metaMatch[2]
      continue
    }

    const sectionName = asSectionName(trimmed)
    if (sectionName !== null) {
      if (current.name !== null || current.lines.length > 0) sections.push(current)
      current = { name: sectionName, lines: [] }
      continue
    }

    if (trimmed === '') {
      if (current.lines.length > 0) current.lines.push({ type: 'empty' })
      continue
    }

    if (trimmed.startsWith('|')) {
      current.lines.push(parseInstrumentalLine(trimmed))
    } else {
      current.lines.push(parseLyricLine(line))
    }
  }

  if (current.name !== null || current.lines.length > 0) sections.push(current)
  return { metadata, sections }
}

/** 整份 ChordPro 移調:改寫所有和弦錨點、| 進行行與 {key:} metadata,其他內容不動。 */
export function transposeContent(content: string, semitones: number): string {
  const keyMatch = /\{\s*key\s*:\s*([^}]+?)\s*\}/.exec(content)
  const originalKey = keyMatch?.[1] ?? null
  const targetKey = originalKey ? transposeKey(originalKey, semitones) : null

  return content
    .split('\n')
    .map((line) => transposeLine(line, semitones, targetKey))
    .join('\n')
}

function transposeLine(line: string, semitones: number, targetKey: string | null): string {
  const trimmed = line.trim()

  if (/^\{\s*key\s*:/.test(trimmed) && targetKey) {
    return line.replace(/\{\s*key\s*:\s*[^}]+?\s*\}/, `{key: ${targetKey}}`)
  }
  if (METADATA_RE.test(trimmed)) return line
  if (asSectionName(trimmed) !== null) return line

  if (trimmed.startsWith('|')) {
    return line.replace(/[A-G][#b]?[^\s|]*/g, (token) =>
      transposeChord(token, semitones, targetKey) ?? token
    )
  }

  return line.replace(/\[([^[\]]+)\]/g, (full, inner: string) => {
    const transposed = transposeChord(inner, semitones, targetKey)
    return transposed ? `[${transposed}]` : full
  })
}
