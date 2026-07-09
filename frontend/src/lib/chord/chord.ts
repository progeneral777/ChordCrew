// 和弦解析與移調 — CHORD_SPEC.md 的 TS 實作。
// 後端 song/chord/ 有對應的 Java 實作,兩邊必須通過同一組測試案例。

export interface ParsedChord {
  root: string
  suffix: string
  bass: string | null
}

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// 各半音的慣用調名(F#/Gb 取 F#、C#/Db 取 Db 等常見寫法)
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm']

// Quality 與 Extension token,依長度遞減排序供貪婪比對
const SUFFIX_TOKENS = [
  '7sus4',
  'add9', 'maj7', 'sus2', 'sus4',
  '6/9', 'maj', 'min', 'dim', 'aug', 'b13', '#11',
  'm7', 'b5', '#5', 'b9', '#9', '11', '13',
  'm', '5', '6', '7', '9', '+', '°',
]

function isValidSuffix(suffix: string): boolean {
  let i = 0
  outer: while (i < suffix.length) {
    for (const token of SUFFIX_TOKENS) {
      if (suffix.startsWith(token, i)) {
        i += token.length
        continue outer
      }
    }
    return false
  }
  return true
}

export function parseChord(input: string): ParsedChord | null {
  if (!input) return null
  let rest = input
  let bass: string | null = null

  const bassMatch = /^(.+)\/([A-G][#b]?)$/.exec(rest)
  if (bassMatch) {
    rest = bassMatch[1]
    bass = bassMatch[2]
  }

  const rootMatch = /^[A-G][#b]?/.exec(rest)
  if (!rootMatch) return null
  const root = rootMatch[0]
  const suffix = rest.slice(root.length)
  if (!isValidSuffix(suffix)) return null

  return { root, suffix, bass }
}

/**
 * 依調號決定升降記號:♭ 調 F/Bb/Eb/Ab/Db/Gb 及其關係小調;
 * 有寫升降記號的調直接看記號;C/Am 預設 ♯。
 */
export function isFlatKey(key: string): boolean {
  const m = /^([A-G])(#|b)?(m(?!aj))?/.exec(key.trim())
  if (!m) return false
  const [, letter, accidental, minor] = m
  if (accidental === 'b') return true
  if (accidental === '#') return false
  return minor ? 'DGCF'.includes(letter) : letter === 'F'
}

export function transposeNote(note: string, semitones: number, useFlat: boolean): string | null {
  const idx = NOTE_INDEX[note]
  if (idx === undefined) return null
  const table = useFlat ? FLAT_NOTES : SHARP_NOTES
  return table[(((idx + semitones) % 12) + 12) % 12]
}

/** 移調 n 半音;無法解析回 null(呼叫端保留原字串並標紅)。 */
export function transposeChord(
  chord: string,
  semitones: number,
  targetKey?: string | null
): string | null {
  const parsed = parseChord(chord)
  if (!parsed) return null
  const useFlat = targetKey ? isFlatKey(targetKey) : false
  const root = transposeNote(parsed.root, semitones, useFlat)
  if (!root) return null
  const bass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlat) : null
  return root + parsed.suffix + (bass ? '/' + bass : '')
}

/** 調名移調,回傳慣用寫法(例:G +1 → Ab、C +1 → Db)。 */
export function transposeKey(key: string, semitones: number): string {
  const m = /^([A-G])(#|b)?(m(?!aj))?$/.exec(key.trim())
  if (!m) return key
  const [, letter, accidental, minor] = m
  const idx = NOTE_INDEX[letter + (accidental ?? '')]
  if (idx === undefined) return key
  const ni = (((idx + semitones) % 12) + 12) % 12
  return minor ? MINOR_KEYS[ni] : MAJOR_KEYS[ni]
}

/** 顯示用:#→♯、b→♭(儲存仍用 ASCII)。 */
export function formatChordDisplay(chord: string): string {
  return chord.replaceAll('#', '♯').replaceAll('b', '♭')
}
