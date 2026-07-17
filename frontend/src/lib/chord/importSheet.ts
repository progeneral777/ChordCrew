import { parseChord } from './chord'

/**
 * 把「和弦一行、歌詞一行」排版的譜(從其他網站複製而來)轉成本站的
 * ChordPro 變體:歌詞內用 [C] 錨點、純伴奏段落用 | C | G | 小節行。
 *
 * 對齊採「顯示欄位」計算:中日韓全形字寬 2、半形寬 1,因此和弦會落在
 * 正確的字上方,而不是被 code unit 位移錯位。
 */

// 全形/CJK 視為寬度 2,其餘寬度 1(近似顯示欄寬)。
function charWidth(cp: number): number {
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK 部首、標點
    (cp >= 0x3041 && cp <= 0x33ff) || // 假名、CJK 符號
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK 擴充 A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 統一表意
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul 音節
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK 相容
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK 相容形式
    (cp >= 0xff00 && cp <= 0xff60) || // 全形 ASCII
    (cp >= 0xffe0 && cp <= 0xffe6)
  ) {
    return 2
  }
  return 1
}

// 回傳和弦要插入的 code point 索引:找出顯示欄位 col 所落在的那個字
// (該字的顯示格 [start, start+width) 包含 col),插在它前面。全形字即使
// col 落在它的右半格,仍歸給該字,避免和弦被推到下一個字。
function indexAtColumn(chars: string[], col: number): number {
  let w = 0
  for (let i = 0; i < chars.length; i++) {
    const cw = charWidth(chars[i].codePointAt(0)!)
    if (w + cw > col) return i
    w += cw
  }
  return chars.length
}

interface Token {
  text: string
  col: number
}

// 取出一行內以空白分隔的 token 及其起始欄位(此行皆為半形,欄=索引)。
function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    tokens.push({ text: m[0], col: m.index })
  }
  return tokens
}

const SECTION_RE = /^\[[^[\]]+\]$/

// 一行是否為「和弦行」:去掉小節線 | 後,至少一個 token 且全部可解析為和弦。
function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed === '' || SECTION_RE.test(trimmed)) return false
  const tokens = tokenize(line).filter((t) => t.text !== '|')
  if (tokens.length === 0) return false
  return tokens.every((t) => parseChord(t.text) !== null)
}

// 把和弦行的和弦依欄位插進歌詞行,產生內嵌 [Chord] 的歌詞。
function mergeChordsIntoLyric(chordLine: string, lyricLine: string): string {
  const chords = tokenize(chordLine).filter((t) => t.text !== '|')
  const chars = Array.from(lyricLine) // 以 code point 切割,避免破壞代理對
  // 由右到左插入,避免影響尚未處理的索引。
  const inserts = chords
    .map((c) => ({ at: indexAtColumn(chars, c.col), text: c.text }))
    .sort((a, b) => b.at - a.at)
  for (const ins of inserts) {
    chars.splice(ins.at, 0, `[${ins.text}]`)
  }
  return chars.join('').replace(/\s+$/, '')
}

// 沒有歌詞行的和弦行 → 輸出為小節行 | C | G | Am | F |。
function toBarLine(chordLine: string): string {
  const chords = tokenize(chordLine)
    .filter((t) => t.text !== '|')
    .map((t) => t.text)
  return `| ${chords.join(' | ')} |`
}

export function importChordSheet(raw: string): string {
  // tab 展開為單一空白(多數複製來的譜用空白對齊;tab 會破壞欄位計算)。
  const lines = raw.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n')
  const out: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (SECTION_RE.test(trimmed)) {
      out.push(trimmed)
      continue
    }

    if (isChordLine(line)) {
      const next = lines[i + 1]
      // 下一行是「非空、非和弦、非段落標題」的歌詞 → 合併
      if (
        next !== undefined &&
        next.trim() !== '' &&
        !isChordLine(next) &&
        !SECTION_RE.test(next.trim())
      ) {
        out.push(mergeChordsIntoLyric(line, next))
        i++ // 消耗掉歌詞行
      } else {
        out.push(toBarLine(line))
      }
      continue
    }

    out.push(line.replace(/\s+$/, ''))
  }

  // 收斂連續空行為最多一行,並去掉頭尾空行。
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}
